const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

type EmailDraftOptions = {
  to: string | string[];
  subject?: string | null;
  body?: string | null;
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
  attachment?: { blob: Blob; filename: string } | null;
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

/**
 * Opens the user's mail client with a prefilled draft. If an attachment is
 * provided, tries the Web Share API first (attaches file directly on mobile
 * + supported desktops). Falls back to downloading the PDF and opening the
 * mailto draft with a note telling the user where the file is.
 *
 * Returns:
 *  - "shared"     — file was attached via native share sheet
 *  - "downloaded" — file downloaded + mailto opened (user must drag file in)
 *  - "opened"     — mailto opened, no attachment
 *  - false        — nothing could be opened
 */
export async function openEmailDraft(
  options: EmailDraftOptions,
): Promise<"shared" | "downloaded" | "opened" | false> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // 1) Try Web Share API with file attachment
  if (options.attachment) {
    try {
      const file = new File([options.attachment.blob], options.attachment.filename, {
        type: options.attachment.blob.type || "application/pdf",
      });
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        const recipients = normalizeList(options.to);
        await nav.share({
          files: [file],
          title: options.subject ?? undefined,
          text: [
            recipients.length ? `To: ${recipients.join(", ")}` : "",
            options.subject ? `Subject: ${options.subject}` : "",
            "",
            cleanEmailText(options.body ?? ""),
          ].filter(Boolean).join("\n"),
        });
        return "shared";
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "shared";
    }

    // 2) Download the PDF so the user can drag it into the draft
    try {
      const url = URL.createObjectURL(options.attachment.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = options.attachment.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
    } catch {
      /* ignore */
    }

    const bodyWithNote = [
      cleanEmailText(options.body ?? ""),
      "",
      `— PDF attached: ${options.attachment.filename} (saved to your Downloads folder — please drag it into this email before sending) —`,
    ].join("\n");
    const href = buildEmailComposeUrl({ ...options, body: bodyWithNote, attachment: null });
    try {
      const link = document.createElement("a");
      link.href = href;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => link.remove(), 0);
      return "downloaded";
    } catch {
      try { window.location.assign(href); return "downloaded"; } catch { return false; }
    }
  }

  // 3) No attachment — plain mailto
  const href = buildEmailComposeUrl(options);
  try {
    const link = document.createElement("a");
    link.href = href;
    link.style.display = "none";
    link.setAttribute("aria-hidden", "true");
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => link.remove(), 0);
    return "opened";
  } catch {
    try { window.location.assign(href); return "opened"; } catch { return false; }
  }
}
