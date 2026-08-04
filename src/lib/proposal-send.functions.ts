import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends a proposal email server-side via Resend, from the business name. */
export const sendProposalNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    proposalId: string;
    to: string;
    subject: string;
    bodyText: string;
    clientName?: string | null;
    pdfBase64?: string;
    pdfFilename?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { sendViaResend, brandedEmailHtml } = await import("./resend-send.server");

    const { data: profile } = await (context.supabase as any)
      .from("business_profiles")
      .select("business_name, email")
      .maybeSingle();

    const businessName = profile?.business_name || "our team";
    const html = brandedEmailHtml({
      businessName,
      greeting: `Hi ${data.clientName || "there"},`,
      bodyText: data.bodyText,
      footerNote: `Sent via WinStream on behalf of ${businessName}.`,
    });

    try {
      await sendViaResend({
        to: data.to,
        subject: data.subject,
        html,
        fromName: businessName,
        replyTo: profile?.email ?? null,
        attachments: data.pdfBase64 && data.pdfFilename
          ? [{ filename: data.pdfFilename, content: data.pdfBase64 }]
          : undefined,
      });
    } catch (e: any) {
      if (String(e?.message ?? e).includes("EMAIL_NOT_VERIFIED")) {
        return { ok: false as const, reason: "EMAIL_NOT_VERIFIED" as const, to: data.to };
      }
      throw e;
    }

    return { ok: true as const, to: data.to };
  });
