import { sendViaResend, brandedEmailHtml } from "./resend-send.server";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function sendRateLimit(ip: string) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

export async function sendPublicDocument(input: {
  to: string;
  subject: string;
  bodyText: string;
  businessName: string;
  clientName?: string | null;
  replyTo?: string | null;
  pdfBase64?: string;
  pdfFilename?: string;
}) {
  const businessName = input.businessName?.trim() || "WinStream";
  const html = brandedEmailHtml({
    businessName,
    greeting: `Hi ${input.clientName || "there"},`,
    bodyText: input.bodyText,
    footerNote: `Sent via WinStream on behalf of ${businessName}.`,
  });

  try {
    await sendViaResend({
      to: input.to,
      subject: input.subject,
      html,
      fromName: businessName,
      replyTo: input.replyTo ?? null,
      attachments:
        input.pdfBase64 && input.pdfFilename
          ? [{ filename: input.pdfFilename, content: input.pdfBase64 }]
          : undefined,
    });
  } catch (e: any) {
    if (String(e?.message ?? e).includes("EMAIL_NOT_VERIFIED")) {
      return { ok: false as const, reason: "EMAIL_NOT_VERIFIED" as const };
    }
    return { ok: false as const, reason: "SEND_FAILED" as const };
  }

  return { ok: true as const, to: input.to };
}
