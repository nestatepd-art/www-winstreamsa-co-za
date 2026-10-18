import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendViaResend, brandedEmailHtml } from "@/lib/resend-send.server";
import { approvalState, escapeApprovalHtml, NUDGE_ACTIONS } from "@/lib/nudge-approval";

let _sb: ReturnType<typeof createClient<Database>> | null = null;
function sb() {
  if (!_sb) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.SUPABASE_URL;
    if (!key || !url) throw new Error("Reminder credentials unavailable");
    _sb = createClient<Database>(url, key, {
      auth: { persistSession: false },
      // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
  }
  return _sb;
}

function page(title: string, message: string, form = "", status = 200): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f8;margin:0;padding:40px 24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #eee;text-align:center">
    <h1 style="font-size:20px;color:#111;margin:0 0 12px">${escapeApprovalHtml(title)}</h1>
    <p style="color:#444;line-height:1.55;margin:0">${escapeApprovalHtml(message)}</p>
    ${form}
    <p style="color:#999;font-size:12px;margin-top:24px">WinStream SA</p>
  </div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } },
  );
}

export const Route = createFileRoute("/api/public/hooks/nudge-confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") || "";
        const action = url.searchParams.get("action") || "";
        if (!token || !NUDGE_ACTIONS.some((item) => item === action)) return page("Invalid link", "This approval link is incomplete or invalid.");
        const { data: conf, error } = await sb().from("nudge_confirmations").select("status, expires_at").eq("token", token).maybeSingle();
        if (error) {
          console.error("Reminder approval lookup failed", error.code, error.message);
          return page("Temporarily unavailable", "We could not load your approval. Please try again shortly.", "", 503);
        }
        const state = approvalState(conf);
        if (state === "missing") return page("Invalid link", "This approval link was not found. Please use the latest approval email.");
        if (state === "handled") return page("Already handled", "This reminder has already been approved, skipped or expired.");
        if (state === "expired") return page("Link expired", "The approval window has closed. This reminder will not be sent.");
        const label = action === "yes" ? "Yes, send it" : action === "no" ? "No, skip this one" : "Cancel all reminders";
        return page("Confirm reminder decision", action === "yes" ? "Send this reminder to your client?" : action === "no" ? "Skip this reminder?" : "Switch off all automatic reminders for your account?", `<form method="post" action="/api/public/hooks/nudge-confirm" style="margin-top:24px"><input type="hidden" name="token" value="${escapeApprovalHtml(token)}"/><input type="hidden" name="action" value="${action}"/><button type="submit" style="padding:12px 22px;background:#166534;color:#fff;border:0;border-radius:6px;font-size:14px;cursor:pointer">${label}</button></form>`);
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const origin = request.headers.get("origin");
        const requestHost = request.headers.get("host");
        if (origin && origin !== url.origin && new URL(origin).host !== requestHost) return page("Invalid request", "Please confirm using the approval page.", "", 403);
        const form = await request.formData();
        const token = String(form.get("token") || "");
        const action = String(form.get("action") || "");
        if (!token || !["yes", "no", "cancel_all"].includes(action)) {
          return page("Invalid link", "This approval link is incomplete or invalid.");
        }

        const supabase = sb();
        const { data: conf, error: lookupError } = await (supabase as any)
          .from("nudge_confirmations")
          .select("*")
          .eq("token", token)
          .maybeSingle();
        if (lookupError) {
          console.error("Reminder approval lookup failed", lookupError.code, lookupError.message);
          return page("Temporarily unavailable", "We could not load your approval. Please try again shortly.", "", 503);
        }
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

        // Atomically consume the decision before sending, so simultaneous clicks cannot send twice.
        const { data: claimed, error: claimError } = await (supabase as any).from("nudge_confirmations")
          .update({ status: action === "yes" ? "confirmed" : action === "no" ? "declined" : "cancelled_all", resolved_at: now })
          .eq("id", conf.id).eq("status", "pending").gt("expires_at", now).select("id").maybeSingle();
        if (claimError) return page("Temporarily unavailable", "Your decision could not be saved. Please try again shortly.", "", 503);
        if (!claimed) return page("Already handled", "This reminder has already been approved, skipped or expired.");

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
        if (!fu || fu.status !== "scheduled" || fu.user_id !== conf.user_id || fu[kind === "quote" ? "quote_id" : "invoice_id"] !== conf.record_id) {
          await (supabase as any).from("nudge_confirmations").update({ status: "confirmed", resolved_at: now }).eq("id", conf.id);
          return page("Already handled", "This reminder has already been sent or skipped.");
        }
        const { data: parent } = await (supabase as any)
          .from(parentTable)
          .select("*, clients(name, contact_person, email)")
          .eq("id", conf.record_id)
          .maybeSingle();
        const client: any = (parent as any)?.clients;
        if (parent && (parent.user_id !== conf.user_id || ["paid", "cancelled", "accepted", "rejected", "expired"].includes(parent.status))) {
          await (supabase as any).from(table).update({ status: "skipped" }).eq("id", conf.followup_id);
          return page("Reminder skipped", "This document no longer needs a reminder.");
        }
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
