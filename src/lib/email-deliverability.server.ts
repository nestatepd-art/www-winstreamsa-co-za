/**
 * Recipient deliverability checks for outgoing app emails.
 *
 * The email provider accepts a send (HTTP 200) even when the recipient can
 * never receive it — the domain doesn't exist, or the address is on the
 * provider's suppression list after earlier bounces. Without these checks the
 * app reported "sent" while nothing reached the client.
 */

export class RecipientUndeliverableError extends Error {
  code = "RECIPIENT_UNDELIVERABLE" as const;
  recipient: string;
  constructor(recipient: string, message: string) {
    super(message);
    this.name = "RecipientUndeliverableError";
    this.recipient = recipient;
  }
}

export function isUndeliverableError(e: unknown): e is RecipientUndeliverableError {
  return !!e && typeof e === "object" && (e as any).code === "RECIPIENT_UNDELIVERABLE";
}

type DomainVerdict = { ok: true } | { ok: false; reason: string };
const domainCache = new Map<string, { verdict: DomainVerdict; at: number }>();
const CACHE_MS = 10 * 60_000;

type DohAnswer = { type: number; data: string };
type DohResponse = { Status: number; Answer?: DohAnswer[] };

async function doh(name: string, type: "MX" | "A" | "AAAA"): Promise<DohResponse | null> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    return (await res.json()) as DohResponse;
  } catch {
    return null;
  }
}

/** Pure verdict from DNS answers — exported for tests. */
export function verdictFromDns(
  domain: string,
  mx: DohResponse | null,
  a: DohResponse | null,
  aaaa: DohResponse | null,
): DomainVerdict {
  // DNS lookup itself failed — never block a send on our own network hiccup.
  if (!mx) return { ok: true };
  if (mx.Status === 3) {
    return { ok: false, reason: `the domain "${domain}" does not exist, so it cannot receive email` };
  }
  const mxRecords = (mx.Answer ?? []).filter((r) => r.type === 15);
  if (mxRecords.length) {
    // RFC 7505 "null MX": "0 ." means the domain explicitly accepts no mail.
    const allNull = mxRecords.every((r) => /^\s*\d+\s+\.\s*$/.test(r.data));
    if (allNull) return { ok: false, reason: `the domain "${domain}" is set up to refuse all email` };
    return { ok: true };
  }
  // No MX → mail falls back to the domain's address records.
  const hasAddr = (r: DohResponse | null) => !!r && (r.Answer ?? []).some((x) => x.type === 1 || x.type === 28);
  if (!a && !aaaa) return { ok: true };
  if (hasAddr(a) || hasAddr(aaaa)) return { ok: true };
  return { ok: false, reason: `the domain "${domain}" has no mail server, so it cannot receive email` };
}

export async function checkEmailDomain(email: string): Promise<DomainVerdict> {
  const domain = email.split("@")[1]?.trim().toLowerCase().replace(/\.$/, "");
  if (!domain || !domain.includes(".")) {
    return { ok: false, reason: `"${email}" is not a valid email address` };
  }
  const cached = domainCache.get(domain);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.verdict;

  const mx = await doh(domain, "MX");
  let a: DohResponse | null = null;
  let aaaa: DohResponse | null = null;
  if (mx && mx.Status !== 3 && !(mx.Answer ?? []).some((r) => r.type === 15)) {
    [a, aaaa] = await Promise.all([doh(domain, "A"), doh(domain, "AAAA")]);
  }
  const verdict = verdictFromDns(domain, mx, a, aaaa);
  domainCache.set(domain, { verdict, at: Date.now() });
  return verdict;
}

export function undeliverableMessage(recipient: string, reason: string) {
  return `Not sent: the client email address ${recipient} can't receive mail — ${reason}. Please confirm the correct address with your client, update it under Clients, and send again.`;
}

export function suppressedMessage(recipient: string) {
  return `Not delivered: ${recipient} is blocked by the email service because earlier emails to this address bounced (the client's mailbox rejected them). Please confirm the correct address with your client, update it under Clients, and send again.`;
}
