import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendViaResend } from "@/lib/resend-send.server";
import { SITE_URL } from "@/lib/seo";

const MAX_SENDS_PER_RUN = 200;
const CONFIRM_WINDOW_HOURS = 24;

let _sb: ReturnType<typeof createClient<Database>> | null = null;
function sb() {
  if (!_sb) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _sb = createClient<Database>(process.env.SUPABASE_URL!, key, {
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

function confirmEmailHtml(opts: {
  businessName: string;
  kind: string;
  ref: string;
  clientName: string;
  subject: string;
  body: string;
  yesUrl: string;
  noUrl: string;
  cancelUrl: string;
  windowHours: number;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const btn = (url: string, label: string, bg: string) =>
    `<a href="${url}" style="display:inline-block;padding:12px 22px;margin:4px 6px 4px 0;border-radius:6px;background:${bg};color:#fff;text-decoration:none;font-weight:bold;font-size:14px">${label}</a>`;
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f8;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;border:1px solid #eee">
    <h2 style="margin:0 0 12px;color:#111;font-size:17px">Approve this ${esc(opts.kind)} reminder?</h2>
    <p style="color:#333;line-height:1.55">Hi ${esc(opts.businessName)},</p>
    <p style="color:#333;line-height:1.55">WinStream is about to send the following reminder to <b>${esc(opts.clientName)}</b> about <b>${esc(opts.ref)}</b>:</p>
    <div style="background:#f6f6f8;border:1px solid #eee;border-radius:6px;padding:14px 16px;margin:12px 0">
      <p style="margin:0 0 6px;font-weight:bold;color:#111;font-size:14px">${esc(opts.subject)}</p>
      <p style="margin:0;color:#555;font-size:13px;white-space:pre-wrap;line-height:1.5">${esc(opts.body)}</p>
    </div>
    <p style="color:#333;line-height:1.55">Do you want it sent?</p>
    <p style="margin:16px 0">${btn(opts.yesUrl, "Yes, send it", "#16a34a")}${btn(opts.noUrl, "No, skip this one", "#6b7280")}${btn(opts.cancelUrl, "Cancel all reminders", "#dc2626")}</p>
    <p style="color:#777;font-size:12px;line-height:1.5">If you don't reply within ${opts.windowHours} hours, this reminder is skipped and the next one in the cycle will ask again. Three unanswered approvals in a row switches your automatic reminders off permanently.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0 12px"/>
    <p style="margin:0;color:#999;font-size:11px">Sent by WinStream — you received this because automatic follow-ups are switched on for your account.</p>
  </div></body></html>`;
}

async function ownerEmail(userId: string, profileEmail?: string | null): Promise<string | null> {
  if (profileEmail) return profileEmail;
  try {
    const { data } = await (sb() as any).auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

async function processDue(
  kind: "quote" | "invoice",
  quota: number,
  results: { sent: number; failed: number; skipped: number; errors: string[] },
) {
  const supabase = sb();
  const table = kind === "quote" ? "quote_followups" : "invoice_followups";
  const parentTable = kind === "quote" ? "quotes" : "invoices";

  const { data: rows, error } = await (supabase as any)
    .from(table)
    .select(`*, ${parentTable}!inner(id, user_id, auto_nudge_enabled, status, ${kind === "quote" ? "quote_number" : "invoice_number"}, clients(name, contact_person, email))`)
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(quota);

  if (error) {
    results.errors.push(`${table}: ${error.message}`);
    return 0;
  }
  const { count: plainCount } = await (supabase as any).from(table).select("id", { count: "exact", head: true }).eq("status", "scheduled").lte("scheduled_for", new Date().toISOString());
  console.log(`[auto-nudge debug] ${table} rows=${(rows ?? []).length} plainDue=${plainCount}`);

  let used = 0;
  for (const row of (rows ?? []) as any[]) {
    if (used >= quota) break;
    const parent = row[parentTable];
    if (!parent?.auto_nudge_enabled) {
      results.skipped++;
      continue;
    }
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

    // Only one live approval request per follow-up
    const { data: existing } = await (supabase as any)
      .from("nudge_confirmations")
      .select("id")
      .eq("followup_id", row.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      results.skipped++;
      continue;
    }

    const { data: prof } = await (supabase as any)
      .from("business_profiles")
      .select("business_name, email, auto_nudge_enabled")
      .eq("user_id", parent.user_id)
      .maybeSingle();
    if (prof && prof.auto_nudge_enabled === false) {
      results.skipped++;
      continue;
    }

    const toOwner = await ownerEmail(parent.user_id, prof?.email);
    if (!toOwner) {
      await (supabase as any).from(table).update({ status: "skipped", error: "no owner email" }).eq("id", row.id);
      results.skipped++;
      continue;
    }

    const expiresAt = new Date(Date.now() + CONFIRM_WINDOW_HOURS * 3600_000).toISOString();
    const { data: conf, error: cErr } = await (supabase as any)
      .from("nudge_confirmations")
      .insert({
        user_id: parent.user_id,
        record_type: kind,
        record_id: parent.id,
        followup_id: row.id,
        expires_at: expiresAt,
      })
      .select("token")
      .single();
    if (cErr || !conf) {
      results.errors.push(`${table} confirm insert: ${cErr?.message ?? "no row"}`);
      results.failed++;
      continue;
    }

    const base = `${SITE_URL}/api/public/hooks/nudge-confirm?token=${conf.token}`;
    const ref = kind === "quote" ? `quote ${parent.quote_number}` : `invoice ${parent.invoice_number}`;
    const html = confirmEmailHtml({
      businessName: prof?.business_name || "there",
      kind,
      ref,
      clientName: parent.clients?.name || "your client",
      subject: row.subject,
      body: row.body,
      yesUrl: `${base}&action=yes`,
      noUrl: `${base}&action=no`,
      cancelUrl: `${base}&action=cancel_all`,
      windowHours: CONFIRM_WINDOW_HOURS,
    });

    try {
      await sendViaResend({
        to: toOwner,
        subject: `Approve reminder to ${parent.clients?.name || "your client"} — ${ref}`,
        html,
        fromName: "WinStream Reminders",
        replyTo: null,
      });
      results.sent++;
      used++;
    } catch (e: any) {
      const msg = String(e?.message ?? e).slice(0, 500);
      await (supabase as any).from("nudge_confirmations").update({ status: "expired", resolved_at: new Date().toISOString() }).eq("followup_id", row.id).eq("status", "pending");
      results.errors.push(`confirm email to owner: ${msg}`);
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
