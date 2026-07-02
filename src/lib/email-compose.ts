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

export const cleanEmailText = (value?: string | null) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

const encodeMailtoValue = (value?: string | null) =>
  encodeURIComponent(cleanEmailText(value)).replace(/%0A/g, "%0D%0A");

export function buildEmailComposeUrl(options: EmailDraftOptions) {
  const recipients = normalizeList(options.to);
  const cc = normalizeList(options.cc);
  const bcc = normalizeList(options.bcc);
  const params: string[] = [];

  if (cc.length) params.push(`cc=${cc.map(encodeURIComponent).join(",")}`);
  if (bcc.length) params.push(`bcc=${bcc.map(encodeURIComponent).join(",")}`);
  if (options.subject?.trim()) params.push(`subject=${encodeMailtoValue(options.subject)}`);
  if (options.body?.trim()) params.push(`body=${encodeMailtoValue(options.body)}`);

  const query = params.join("&");
  return `mailto:${recipients.map(encodeURIComponent).join(",")}${query ? `?${query}` : ""}`;
}

export function openEmailDraft(options: EmailDraftOptions) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const href = buildEmailComposeUrl(options);
  try {
    const link = document.createElement("a");
    link.href = href;
    link.style.display = "none";
    link.setAttribute("aria-hidden", "true");
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => link.remove(), 0);
    return true;
  } catch {
    try {
      window.location.assign(href);
      return true;
    } catch {
      return false;
    }
  }
}