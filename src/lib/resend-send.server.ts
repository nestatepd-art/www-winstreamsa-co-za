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
};

export async function sendViaResend(input: ResendSendInput): Promise<{ id?: string; raw: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email credentials not configured");

  const fromLabel = (input.fromName || "WinStream").replace(/[<>]/g, "").trim() || "WinStream";
  const body: Record<string, unknown> = {
    from: `${fromLabel} <onboarding@resend.dev>`,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  };
  if (input.replyTo) body.reply_to = input.replyTo;
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
  if (!res.ok) throw new Error(`Resend ${res.status}: ${text.slice(0, 400)}`);
  try {
    return { id: JSON.parse(text)?.id, raw: text };
  } catch {
    return { raw: text };
  }
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
