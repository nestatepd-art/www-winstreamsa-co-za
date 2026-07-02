const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export const extractEmailAddress = (value?: string | null) =>
  value?.match(EMAIL_PATTERN)?.[0] ?? "";

const encodeMailtoParam = (value: string) => encodeURIComponent(value).replace(/%20/g, "%20");

export function buildMailtoUrl(options: {
  to: string | string[];
  subject?: string | null;
  body?: string | null;
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
}) {
  const normalizeList = (value?: string | string[] | null) =>
    (Array.isArray(value) ? value : String(value ?? "").split(/[;,]/))
      .map((entry) => extractEmailAddress(entry.trim()) || entry.trim())
      .filter(Boolean);

  const recipients = normalizeList(options.to);
  const params: Array<[string, string]> = [];
  const cc = normalizeList(options.cc);
  const bcc = normalizeList(options.bcc);

  if (cc.length) params.push(["cc", cc.join(",")]);
  if (bcc.length) params.push(["bcc", bcc.join(",")]);
  if (options.subject?.trim()) params.push(["subject", options.subject.trim()]);
  if (options.body?.trim()) params.push(["body", options.body.trim()]);

  const query = params
    .map(([key, value]) => `${key}=${encodeMailtoParam(value)}`)
    .join("&");

  return `mailto:${recipients.map(encodeURI).join(",")}${query ? `?${query}` : ""}`;
}

export function openEmailDraft(options: Parameters<typeof buildMailtoUrl>[0]) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const href = buildMailtoUrl(options);
  const link = document.createElement("a");
  link.href = href;
  link.style.display = "none";
  link.setAttribute("aria-hidden", "true");
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => link.remove(), 0);
  return true;
}