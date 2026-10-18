import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendViaResend, brandedEmailHtml } from "@/lib/resend-send.server";

let _sb: ReturnType<typeof createClient<Database>> | null = null;
function sb() {
  if (!_sb) {
    _sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _sb;
}

function page(title: string, message: string): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f8;margin:0;padding:40px 24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #eee;text-align:center">
    <h1 style="font-size:20px;color:#111;margin:0 0 12px">${title}</h1>
    <p style="color:#444;line-height:1.55;margin:0">${message}</p>
    <p style="color:#999;font-size:12px;margin-top:24px">WinStream SA</p>
  </div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/hooks/nudge-confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") || "";
        const action = url.searchParams.get("action") || "";
        if (!token || !["yes", "no", "cancel_all"].includes(action)) {
          return page("Invalid link", "This approval link is incomplete or invalid.");
        }

        const supabase = sb();
        const { data: conf } = await (supabase as any)
          .from("nudge_confirmations")
          .select("*")
          .eq("token", token)
          .maybeSingle();
        if (!conf) return page("Invalid link", "This approval link was not found.");
        if (conf.status !== "pending") {
          return page("Already handled", "This reminder has already been approved, skipped or expired.");
        }
        if (new Date(conf.expires_at).getTime() < Date.now()) {
          return page("Link expired", "The approval window for this reminder has closed. The reminder was skipped — the next one in the cycle will ask again.");
        }

        const now = new Date().toISOString();
        const kind = conf.record_type as "quote" | "invoice";
        const table = kind === "quote" ? "quote_followups" : "invoice_followups";
        const parentTable = kind === "quote" ? "quotes" : "invoices";

        // Any deliberate reply resets the unanswered counter
        await (supabase as any)
          .from("business_profiles")
          .update({ nudge_unanswered_count: 0 })
          .eq("user_id", conf.user_id);

        if (action === "cancel_all") {
          await (supabase as any)
            .from("nudge_confirmations")
            .update({ status: "cancelled_all", resolved_at: now })
            .eq("id", conf.id);
          await (supabase as any)
            .from("business_profiles")
            .update({ auto_nudge_enabled: false })
            .eq("user_id", conf.user_id);
          await (supabase as any).from("quote_followups").update({ status: "skipped" }).eq("user_id", conf.user_id).eq("status", "scheduled");
          await (supabase as any).from("invoice_followups").update({ status: "skipped" }).eq("user_id", conf.user_id).eq("status", "scheduled");
          return page(
            "All reminders cancelled",
            "Automatic reminders are now switched off for your whole account. You can switch them back on in Settings whenever you're ready.",
          );
        }

        if (action === "no") {
          await (supabase as any).from("nudge_confirmations").update({ status: "declined", resolved_at: now }).eq("id", conf.id);
          await (supabase as any).from(table).update({ status: "skipped" }).eq("id", conf.followup_id);
          return page("Reminder skipped", "This reminder will not be sent. The next one in the cycle will ask for your approval again.");
        }

        // action === "yes": send the reminder to the client now
        const { data: fu } = await (supabase as any).from(table).select("*").eq("id", conf.followup_id).maybeSingle();
        if (!fu || fu.status !== "scheduled") {
          await (supabase as any).from("nudge_confirmations").update({ status: "confirmed", resolved_at: now }).eq("id", conf.id);
          return page("Already handled", "This reminder has already been sent or skipped.");
        }
        const { data: parent } = await (supabase as any)
          .from(parentTable)
          .select("*, clients(name, contact_person, email)")
          .eq("id", conf.record_id)
          .maybeSingle();
        const client: any = (parent as any)?.clients;
        const toEmail: string | undefined = client?.email;
        if (!parent || !toEmail) {
          await (supabase as any).from("nudge_confirmations").update({ status: "confirmed", resolved_at: now }).eq("id", conf.id);
          await (supabase as any).from(table).update({ status: "skipped", error: "no client email" }).eq("id", conf.followup_id);
          return page("Cannot send", "This client has no email address on file, so the reminder could not be sent.");
        }

        const { data: prof } = await (supabase as any)
          .from("business_profiles")
          .select("business_name, email")
          .eq("user_id", conf.user_id)
          .maybeSingle();
        const businessName = prof?.business_name || "our team";
        const greeting = `Hi ${client?.contact_person || client?.name || "there"},`;
        const html = brandedEmailHtml({
          businessName,
          greeting,
          bodyText: fu.body,
          footerNote: `Sent via WinStream on behalf of ${businessName}.`,
        });

        try {
          await sendViaResend({
            to: toEmail,
            subject: fu.subject,
            html,
            fromName: businessName,
            replyTo: prof?.email ?? null,
          });
        } catch (e: any) {
          const msg = String(e?.message ?? e).slice(0, 500);
          await (supabase as any).from(table).update({ status: "failed", error: msg }).eq("id", conf.followup_id);
          await (supabase as any).from("nudge_log").insert({
            user_id: conf.user_id, record_type: kind, record_id: conf.record_id,
            sent_to: toEmail, subject: fu.subject, status: "failed", error: msg,
          });
          return page("Send failed", "The reminder could not be sent right now. Please try sending it manually from the app.");
        }

        await (supabase as any).from(table).update({ status: "sent", sent_at: now, error: null }).eq("id", conf.followup_id);
        await (supabase as any).from("nudge_confirmations").update({ status: "confirmed", resolved_at: now }).eq("id", conf.id);
        if (kind === "invoice" && (parent as any).status !== "overdue" && (parent as any).status !== "paid") {
          await (supabase as any).from("invoices").update({ status: "overdue" }).eq("id", conf.record_id);
        }
        await (supabase as any).from("nudge_log").insert({
          user_id: conf.user_id, record_type: kind, record_id: conf.record_id,
          sent_to: toEmail, subject: fu.subject, status: "sent",
        });
        return page("Reminder sent", `Done — the reminder was emailed to ${toEmail}.`);
      },
    },
  },
});
