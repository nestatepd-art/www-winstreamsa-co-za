import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const MAX_SENDS_PER_RUN = 200;

const INVOICE_MIN_OVERDUE_DAYS = 1;
const INVOICE_COOLDOWN_DAYS = 7;
const INVOICE_MAX_NUDGES = 3;

const QUOTE_MIN_QUIET_DAYS = 5;
const QUOTE_COOLDOWN_DAYS = 7;
const QUOTE_MAX_NUDGES = 2;

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

function daysAgoISO(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function formatZAR(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function invoiceEmail(opts: {
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  total: number;
  dueDate: string | null;
  daysOverdue: number;
  ownerEmail?: string | null;
}) {
  const { clientName, businessName, invoiceNumber, total, dueDate, daysOverdue, ownerEmail } = opts;
  const subject = `Friendly reminder: Invoice ${invoiceNumber} from ${businessName}`;
  const replyLine = ownerEmail ? `<p style="margin:16px 0 0;color:#555">Reply to this email to reach ${businessName} directly.</p>` : "";
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f6f8;margin:0;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;border:1px solid #eee">
      <h2 style="margin:0 0 8px;color:#111">Hi ${clientName || "there"},</h2>
      <p style="margin:0 0 16px;color:#333">This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> for <strong>${formatZAR(total)}</strong> was due on <strong>${fmtDate(dueDate)}</strong> (${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago).</p>
      <p style="margin:0 0 16px;color:#333">If you've already paid, thank you — please ignore this note. Otherwise, we'd appreciate your prompt settlement.</p>
      ${replyLine}
      <p style="margin:24px 0 0;color:#666;font-size:13px">Kind regards,<br/><strong>${businessName}</strong></p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px"/>
      <p style="margin:0;color:#999;font-size:11px">Sent automatically via WinStream on behalf of ${businessName}.</p>
    </div></body></html>`;
  return { subject, html };
}

function quoteEmail(opts: {
  clientName: string;
  businessName: string;
  quoteNumber: string;
  total: number;
  ownerEmail?: string | null;
}) {
  const { clientName, businessName, quoteNumber, total, ownerEmail } = opts;
  const subject = `Following up on quote ${quoteNumber} from ${businessName}`;
  const replyLine = ownerEmail ? `<p style="margin:16px 0 0;color:#555">Reply to this email to reach ${businessName} directly.</p>` : "";
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f6f8;margin:0;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;border:1px solid #eee">
      <h2 style="margin:0 0 8px;color:#111">Hi ${clientName || "there"},</h2>
      <p style="margin:0 0 16px;color:#333">Just checking in on quote <strong>${quoteNumber}</strong> (<strong>${formatZAR(total)}</strong>) we sent through.</p>
      <p style="margin:0 0 16px;color:#333">Any questions or adjustments you'd like us to make? Happy to talk it through.</p>
      ${replyLine}
      <p style="margin:24px 0 0;color:#666;font-size:13px">Kind regards,<br/><strong>${businessName}</strong></p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px"/>
      <p style="margin:0;color:#999;font-size:11px">Sent automatically via WinStream on behalf of ${businessName}.</p>
    </div></body></html>`;
  return { subject, html };
}

async function sendViaResend(to: string, subject: string, html: string, replyTo?: string | null, fromName?: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email credentials not configured");

  const fromLabel = (fromName || "WinStream Reminders").replace(/[<>]/g, "");
  const body: Record<string, unknown> = {
    from: `${fromLabel} <onboarding@resend.dev>`,
    to: [to],
    subject,
    html,
  };
  if (replyTo) body.reply_to = replyTo;

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
  if (!res.ok) throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  return text;
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

        const supabase = sb();
        const results = { invoices_sent: 0, quotes_sent: 0, skipped: 0, failed: 0, errors: [] as string[] };
        let quota = MAX_SENDS_PER_RUN;

        // ---------- INVOICES ----------
        const invCooldown = daysAgoISO(INVOICE_COOLDOWN_DAYS);
        const today = new Date();
        const invDueBefore = new Date(today.getTime() - INVOICE_MIN_OVERDUE_DAYS * 86400000).toISOString().slice(0, 10);

        const { data: invoices, error: invErr } = await supabase
          .from("invoices")
          .select("id, user_id, invoice_number, total, due_date, status, nudge_count, last_nudged_at, auto_nudge_enabled, client_id, clients(name, email)")
          .eq("auto_nudge_enabled", true)
          .in("status", ["sent", "viewed", "overdue"])
          .lte("due_date", invDueBefore)
          .lt("nudge_count", INVOICE_MAX_NUDGES)
          .or(`last_nudged_at.is.null,last_nudged_at.lte.${invCooldown}`)
          .limit(quota);

        if (invErr) results.errors.push(`invoices query: ${invErr.message}`);

        for (const inv of invoices ?? []) {
          if (quota <= 0) break;
          const client: any = (inv as any).clients;
          const toEmail: string | null = client?.email ?? null;
          if (!toEmail) {
            results.skipped++;
            await supabase.from("nudge_log").insert({
              user_id: inv.user_id, record_type: "invoice", record_id: inv.id,
              sent_to: "-", subject: `Invoice ${inv.invoice_number}`, status: "skipped", error: "client has no email",
            });
            continue;
          }

          // Fetch business profile per user (cache-light for simplicity)
          const { data: prof } = await supabase
            .from("business_profiles")
            .select("business_name, email, auto_nudge_enabled")
            .eq("user_id", inv.user_id)
            .maybeSingle();

          if (prof && prof.auto_nudge_enabled === false) {
            results.skipped++;
            continue;
          }

          const businessName = prof?.business_name || "Your supplier";
          const dueDate = (inv as any).due_date as string | null;
          const daysOverdue = dueDate
            ? Math.max(1, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000))
            : 1;

          const { subject, html } = invoiceEmail({
            clientName: client?.name ?? "",
            businessName,
            invoiceNumber: (inv as any).invoice_number,
            total: Number((inv as any).total ?? 0),
            dueDate,
            daysOverdue,
            ownerEmail: prof?.email ?? null,
          });

          try {
            await sendViaResend(toEmail, subject, html, prof?.email ?? null, businessName);
            await supabase.from("invoices").update({
              last_nudged_at: new Date().toISOString(),
              nudge_count: ((inv as any).nudge_count ?? 0) + 1,
              status: "overdue",
            }).eq("id", inv.id);
            await supabase.from("nudge_log").insert({
              user_id: inv.user_id, record_type: "invoice", record_id: inv.id,
              sent_to: toEmail, subject, status: "sent",
            });
            results.invoices_sent++;
            quota--;
          } catch (e: any) {
            results.failed++;
            await supabase.from("nudge_log").insert({
              user_id: inv.user_id, record_type: "invoice", record_id: inv.id,
              sent_to: toEmail, subject, status: "failed", error: String(e?.message ?? e).slice(0, 500),
            });
          }
        }

        // ---------- QUOTES ----------
        const qCooldown = daysAgoISO(QUOTE_COOLDOWN_DAYS);
        const qCreatedBefore = daysAgoISO(QUOTE_MIN_QUIET_DAYS);

        const { data: quotes, error: qErr } = await supabase
          .from("quotes")
          .select("id, user_id, quote_number, total, status, nudge_count, last_nudged_at, auto_nudge_enabled, client_id, created_at, clients(name, email)")
          .eq("auto_nudge_enabled", true)
          .in("status", ["sent", "viewed"])
          .lte("created_at", qCreatedBefore)
          .lt("nudge_count", QUOTE_MAX_NUDGES)
          .or(`last_nudged_at.is.null,last_nudged_at.lte.${qCooldown}`)
          .limit(quota);

        if (qErr) results.errors.push(`quotes query: ${qErr.message}`);

        for (const q of quotes ?? []) {
          if (quota <= 0) break;
          const client: any = (q as any).clients;
          const toEmail: string | null = client?.email ?? null;
          if (!toEmail) {
            results.skipped++;
            await supabase.from("nudge_log").insert({
              user_id: q.user_id, record_type: "quote", record_id: q.id,
              sent_to: "-", subject: `Quote ${(q as any).quote_number}`, status: "skipped", error: "client has no email",
            });
            continue;
          }

          const { data: prof } = await supabase
            .from("business_profiles")
            .select("business_name, email, auto_nudge_enabled")
            .eq("user_id", q.user_id)
            .maybeSingle();

          if (prof && prof.auto_nudge_enabled === false) {
            results.skipped++;
            continue;
          }

          const businessName = prof?.business_name || "Your supplier";
          const { subject, html } = quoteEmail({
            clientName: client?.name ?? "",
            businessName,
            quoteNumber: (q as any).quote_number,
            total: Number((q as any).total ?? 0),
            ownerEmail: prof?.email ?? null,
          });

          try {
            await sendViaResend(toEmail, subject, html, prof?.email ?? null, businessName);
            await supabase.from("quotes").update({
              last_nudged_at: new Date().toISOString(),
              nudge_count: ((q as any).nudge_count ?? 0) + 1,
            }).eq("id", q.id);
            await supabase.from("nudge_log").insert({
              user_id: q.user_id, record_type: "quote", record_id: q.id,
              sent_to: toEmail, subject, status: "sent",
            });
            results.quotes_sent++;
            quota--;
          } catch (e: any) {
            results.failed++;
            await supabase.from("nudge_log").insert({
              user_id: q.user_id, record_type: "quote", record_id: q.id,
              sent_to: toEmail, subject, status: "failed", error: String(e?.message ?? e).slice(0, 500),
            });
          }
        }

        return new Response(JSON.stringify({ ok: true, ...results, ran_at: new Date().toISOString() }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => new Response(JSON.stringify({ ok: true, hint: "POST with apikey header to trigger" }), { headers: { "Content-Type": "application/json" } }),
    },
  },
});
