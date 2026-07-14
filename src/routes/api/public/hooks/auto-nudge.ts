import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendViaResend, brandedEmailHtml } from "@/lib/resend-send.server";

const MAX_SENDS_PER_RUN = 200;

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

async function processDue(
  kind: "quote" | "invoice",
  quota: number,
  results: { sent: number; failed: number; skipped: number; errors: string[] },
) {
  const supabase = sb();
  const table = kind === "quote" ? "quote_followups" : "invoice_followups";
  const parentTable = kind === "quote" ? "quotes" : "invoices";
  const parentFk = kind === "quote" ? "quote_id" : "invoice_id";

  const { data: rows, error } = await (supabase as any)
    .from(table)
    .select(`*, ${parentTable}!inner(id, user_id, auto_nudge_enabled, status, clients(name, contact_person, email))`)
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(quota);

  if (error) {
    results.errors.push(`${table}: ${error.message}`);
    return 0;
  }

  let used = 0;
  for (const row of (rows ?? []) as any[]) {
    if (used >= quota) break;
    const parent = row[parentTable];
    if (!parent?.auto_nudge_enabled) {
      results.skipped++;
      continue;
    }
    // Skip terminal statuses on parent
    if (kind === "quote" && ["accepted", "rejected", "expired"].includes(parent.status)) {
      await (supabase as any).from(table).update({ status: "skipped" }).eq("id", row.id);
      results.skipped++;
      continue;
    }
    if (kind === "invoice" && ["paid", "cancelled"].includes(parent.status)) {
      await (supabase as any).from(table).update({ status: "skipped" }).eq("id", row.id);
      results.skipped++;
      continue;
    }

    const client = parent.clients;
    const toEmail: string | undefined = client?.email;
    if (!toEmail) {
      await (supabase as any).from(table).update({ status: "skipped", error: "no client email" }).eq("id", row.id);
      await (supabase as any).from("nudge_log").insert({
        user_id: parent.user_id, record_type: kind, record_id: parent.id,
        sent_to: "-", subject: row.subject, status: "skipped", error: "no client email",
      });
      results.skipped++;
      continue;
    }

    // Check master toggle
    const { data: prof } = await (supabase as any)
      .from("business_profiles")
      .select("business_name, email, auto_nudge_enabled")
      .eq("user_id", parent.user_id)
      .maybeSingle();
    if (prof && prof.auto_nudge_enabled === false) {
      results.skipped++;
      continue;
    }

    const businessName = prof?.business_name || "our team";
    const greeting = `Hi ${client?.contact_person || client?.name || "there"},`;
    const html = brandedEmailHtml({
      businessName,
      greeting,
      bodyText: row.body,
      footerNote: `Sent automatically via WinStream on behalf of ${businessName}.`,
    });

    try {
      await sendViaResend({
        to: toEmail,
        subject: row.subject,
        html,
        fromName: businessName,
        replyTo: prof?.email ?? null,
      });
      await (supabase as any).from(table).update({
        status: "sent", sent_at: new Date().toISOString(), error: null,
      }).eq("id", row.id);
      if (kind === "invoice" && parent.status !== "overdue" && parent.status !== "paid") {
        await (supabase as any).from("invoices").update({ status: "overdue" }).eq("id", parent.id);
      }
      await (supabase as any).from("nudge_log").insert({
        user_id: parent.user_id, record_type: kind, record_id: parent.id,
        sent_to: toEmail, subject: row.subject, status: "sent",
      });
      results.sent++;
      used++;
    } catch (e: any) {
      const msg = String(e?.message ?? e).slice(0, 500);
      await (supabase as any).from(table).update({ status: "failed", error: msg }).eq("id", row.id);
      await (supabase as any).from("nudge_log").insert({
        user_id: parent.user_id, record_type: kind, record_id: parent.id,
        sent_to: toEmail, subject: row.subject, status: "failed", error: msg,
      });
      results.failed++;
    }
  }
  return used;
}

export const Route = createFileRoute("/api/public/hooks/auto-nudge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const results = { sent: 0, failed: 0, skipped: 0, errors: [] as string[] };
        let quota = MAX_SENDS_PER_RUN;
        quota -= await processDue("invoice", quota, results);
        quota -= await processDue("quote", quota, results);

        return new Response(JSON.stringify({ ok: true, ...results, ran_at: new Date().toISOString() }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => new Response(JSON.stringify({ ok: true, hint: "POST with apikey header to trigger" }), { headers: { "Content-Type": "application/json" } }),
    },
  },
});
