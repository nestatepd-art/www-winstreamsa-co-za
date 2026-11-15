import {
  RecipientUndeliverableError,
  checkEmailDomain,
  suppressedMessage,
  undeliverableMessage,
} from "./email-deliverability.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export type ResendAttachment = {
  filename: string;
  /** base64-encoded content (no data URL prefix) */
  content: string;
};

export type ResendSendInput = {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string | null;
  attachments?: ResendAttachment[];
  /** Report blocked/undelivered sends to the app monitor (default true). */
  monitor?: boolean;
};

/** Cached lookup of a verified sending domain (so direct send starts working the moment DNS verifies). */
let verifiedDomainCache: { value: string | null; at: number } = { value: null, at: 0 };

async function getVerifiedDomain(lovableKey: string, resendKey: string): Promise<string | null> {
  const now = Date.now();
  if (now - verifiedDomainCache.at < 5 * 60_000) return verifiedDomainCache.value;
  try {
    const res = await fetch(`${GATEWAY_URL}/domains`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
    });
    if (!res.ok) throw new Error(String(res.status));
    const json: any = await res.json();
    const verified = (json?.data ?? []).find((d: any) => d?.status === "verified");
    verifiedDomainCache = { value: verified?.name ?? null, at: now };
  } catch {
    verifiedDomainCache = { value: null, at: now };
  }
  return verifiedDomainCache.value;
}

async function reportBlocked(input: ResendSendInput, message: string, stage: string) {
  if (input.monitor === false) return;
  try {
    const { recordMonitorEvent } = await import("./monitor.server");
    await recordMonitorEvent({
      kind: "email_blocked",
      severity: "warning",
      title: `Email to ${input.to} could not be delivered`,
      fingerprint: `email_blocked|${input.to.toLowerCase()}`,
      dedupeHours: 24,
      detail: { Recipient: input.to, Sender: input.fromName, Subject: input.subject, Stage: stage, Reason: message },
    });
  } catch {
    /* monitoring must never break sending */
  }
}

/** After the provider accepts a send, confirm it wasn't immediately suppressed. */
async function confirmNotSuppressed(id: string, lovableKey: string, resendKey: string) {
  for (const waitMs of [1200, 1800]) {
    await new Promise((r) => setTimeout(r, waitMs));
    try {
      const res = await fetch(`${GATEWAY_URL}/emails/${id}`, {
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey },
      });
      if (!res.ok) return "unknown";
      const json: any = await res.json();
      const ev = String(json?.last_event ?? "");
      if (ev === "suppressed" || ev === "bounced" || ev === "failed") return ev;
      if (ev === "delivered" || ev === "sent" || ev === "delivery_delayed") return ev;
    } catch {
      return "unknown";
    }
  }
  return "unknown";
}

export async function sendViaResend(input: ResendSendInput): Promise<{ id?: string; raw: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email credentials not configured");

  const to = String(input.to ?? "").trim();
  // 1) The recipient's domain must be able to receive mail at all.
  const recipientCheck = await checkEmailDomain(to);
  if (!recipientCheck.ok) {
    const message = undeliverableMessage(to, recipientCheck.reason);
    await reportBlocked(input, message, "before sending (address check)");
    throw new RecipientUndeliverableError(to, message);
  }
  // A reply-to on a dead domain means client replies bounce; send without it.
  let replyTo = input.replyTo?.trim() || null;
  if (replyTo) {
    const replyCheck = await checkEmailDomain(replyTo);
    if (!replyCheck.ok) replyTo = null;
  }

  const fromLabel = (input.fromName || "WinStream").replace(/[<>]/g, "").trim() || "WinStream";
  const domain = await getVerifiedDomain(LOVABLE_API_KEY, RESEND_API_KEY);
  const fromAddress = domain ? `noreply@${domain}` : "onboarding@resend.dev";
  const body: Record<string, unknown> = {
    from: `${fromLabel} <${fromAddress}>`,
    to: [to],
    subject: input.subject,
    html: input.html,
  };

  if (replyTo) body.reply_to = replyTo;
  if (input.attachments?.length) body.attachments = input.attachments;

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    // Unverified sending domain: provider only allows delivery to the account owner.
    // Surface a stable code so the UI can fall back to the user's own mail client.
    if (res.status === 403 && /only send testing emails|verify a domain/i.test(text)) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }
    if (input.monitor !== false) {
      try {
        const { recordMonitorEvent } = await import("./monitor.server");
        await recordMonitorEvent({
          kind: "request_failed",
          severity: "critical",
          title: `Email service rejected a send (${res.status})`,
          fingerprint: `email_provider|${res.status}`,
          detail: { Status: res.status, Response: text.slice(0, 400), Recipient: to },
        });
      } catch {
        /* ignore */
      }
    }
    throw new Error(`Resend ${res.status}: ${text.slice(0, 400)}`);
  }
  let id: string | undefined;
  try {
    id = JSON.parse(text)?.id;
  } catch {
    /* ignore */
  }

  // 2) The provider accepts sends to suppressed addresses and silently drops them.
  if (id) {
    const status = await confirmNotSuppressed(id, LOVABLE_API_KEY, RESEND_API_KEY);
    if (status === "suppressed" || status === "bounced" || status === "failed") {
      const message = suppressedMessage(to);
      await reportBlocked(input, message, `after sending (provider status: ${status})`);
      throw new RecipientUndeliverableError(to, message);
    }
  }
  return { id, raw: text };
}

export function brandedEmailHtml(opts: {
  businessName: string;
  greeting: string;
  bodyText: string;
  footerNote?: string;
}): string {
  const { businessName, greeting, bodyText, footerNote } = opts;
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;color:#333;line-height:1.55;white-space:pre-wrap">${escapeHtml(p)}</p>`)
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f8;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;border:1px solid #eee">
    <h2 style="margin:0 0 16px;color:#111;font-size:16px">${escapeHtml(greeting)}</h2>
    ${paragraphs}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px"/>
    <p style="margin:0;color:#999;font-size:11px">${escapeHtml(footerNote || `Sent via WinStream on behalf of ${businessName}.`)}</p>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
