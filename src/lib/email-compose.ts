const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

type EmailDraftOptions = {
  to: string | string[];
  subject?: string | null;
  body?: string | null;
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
};

export const extractEmailAddress = (value?: string | null) =>
  value?.match(EMAIL_PATTERN)?.[0] ?? "";

const normalizeList = (value?: string | string[] | null) =>
  (Array.isArray(value) ? value : String(value ?? "").split(/[;,]/))
    .map((entry) => extractEmailAddress(entry.trim()) || entry.trim())
    .filter(Boolean);

export function buildEmailComposeUrl(options: EmailDraftOptions) {
  const recipients = normalizeList(options.to);
  const cc = normalizeList(options.cc);
  const bcc = normalizeList(options.bcc);
  const params = new URLSearchParams();

  if (cc.length) params.set("cc", cc.join(","));
  if (bcc.length) params.set("bcc", bcc.join(","));
  if (options.subject?.trim()) params.set("subject", options.subject.trim());
  if (options.body?.trim()) params.set("body", options.body.trim());

  const query = params.toString();
  return `mailto:${encodeURIComponent(recipients.join(","))}${query ? `?${query}` : ""}`;
}

export function openEmailDraft(options: EmailDraftOptions) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const href = buildEmailComposeUrl(options);
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  link.setAttribute("aria-hidden", "true");
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => link.remove(), 0);
  return true;
}