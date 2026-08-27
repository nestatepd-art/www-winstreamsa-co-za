import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { runSchedule, nextRunDate } from "@/lib/recurring.server";

const MAX_PER_RUN = 100;

let _sb: ReturnType<typeof createClient<Database>> | null = null;
function sb() {
  if (!_sb) {
    _sb = createClient<Database>(
      (globalThis as any).process.env.SUPABASE_URL!,
      (globalThis as any).process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _sb;
}

async function process(limitTo?: string) {
  const supabase = sb() as any;
  const today = new Date().toISOString().slice(0, 10);
  const results = { created: 0, emailed: 0, failed: 0, errors: [] as string[] };

  let query = supabase
    .from("recurring_invoices")
    .select("*")
    .eq("active", true)
    .lte("next_run_date", today)
    .limit(MAX_PER_RUN);
  if (limitTo) query = query.eq("id", limitTo);

  const { data: rows, error } = await query;
  if (error) {
    results.errors.push(error.message);
    return results;
  }

  for (const row of (rows ?? []) as any[]) {
    // Claim first (idempotent progress marking): advance the schedule so a
    // concurrent or retried run can't re-issue the same month's invoice.
    const advanced = nextRunDate(row.day_of_month, new Date());
    const { data: claimed } = await supabase
      .from("recurring_invoices")
      .update({ next_run_date: advanced, last_run_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("next_run_date", row.next_run_date)
      .select("id");
    if (!claimed?.length) continue;

    try {
      const res = await runSchedule(supabase, row);
      results.created++;
      if (res.emailed) results.emailed++;
      await supabase
        .from("recurring_invoices")
        .update({
          last_invoice_id: res.invoiceId,
          run_count: (row.run_count ?? 0) + 1,
          last_error: res.emailError ?? null,
        })
        .eq("id", row.id);
    } catch (e: any) {
      results.failed++;
      const msg = String(e?.message ?? e).slice(0, 500);
      results.errors.push(msg);
      await supabase.from("recurring_invoices").update({ last_error: msg }).eq("id", row.id);
    }
  }
  return results;
}

export const Route = createFileRoute("/api/public/hooks/recurring-invoices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>;
        const expected =
          env.SUPABASE_PUBLISHABLE_KEY ||
          env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        let scheduleId: string | undefined;
        try {
          const body = (await request.json()) as any;
          if (typeof body?.scheduleId === "string") scheduleId = body.scheduleId;
        } catch {
          /* empty body is fine */
        }
        const results = await process(scheduleId);
        return new Response(
          JSON.stringify({ ok: true, ...results, ran_at: new Date().toISOString() }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST with apikey header to trigger" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
