import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecurringInput = {
  id?: string;
  client_id: string | null;
  title: string;
  day_of_month: number;
  items: { description: string; quantity: number; unit_price: number }[];
  vat_rate: number;
  due_days: number;
  notes?: string | null;
  terms?: string | null;
  email_subject?: string | null;
  email_body?: string | null;
  auto_send: boolean;
  active: boolean;
};

export const listRecurring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("recurring_invoices")
      .select("*, clients(name, email)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RecurringInput) => d)
  .handler(async ({ data, context }) => {
    const { nextRunDate } = await import("./recurring.server");
    const day = Math.min(Math.max(Math.round(data.day_of_month) || 1, 1), 28);

    const patch: Record<string, unknown> = {
      user_id: context.userId,
      client_id: data.client_id,
      title: data.title || "Monthly invoice",
      day_of_month: day,
      items: data.items,
      vat_rate: data.vat_rate,
      due_days: data.due_days,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
      email_subject: data.email_subject ?? null,
      email_body: data.email_body ?? null,
      auto_send: data.auto_send,
      active: data.active,
    };

    if (data.id) {
      const { error } = await (context.supabase as any)
        .from("recurring_invoices")
        .update(patch)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    // First run: the chosen day this month if still ahead, otherwise next month.
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
    const first =
      thisMonth.toISOString().slice(0, 10) > now.toISOString().slice(0, 10)
        ? thisMonth.toISOString().slice(0, 10)
        : nextRunDate(day, now);

    const { data: row, error } = await (context.supabase as any)
      .from("recurring_invoices")
      .insert({ ...patch, next_run_date: first })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const setRecurringActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("recurring_invoices")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("recurring_invoices")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Run a schedule immediately (test send) without touching its monthly cadence. */
export const runRecurringNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { runSchedule } = await import("./recurring.server");
    const { data: row, error } = await (context.supabase as any)
      .from("recurring_invoices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error(error?.message || "Schedule not found");

    const res = await runSchedule(context.supabase as any, row);
    await (context.supabase as any)
      .from("recurring_invoices")
      .update({
        last_run_at: new Date().toISOString(),
        last_invoice_id: res.invoiceId,
        run_count: (row.run_count ?? 0) + 1,
        last_error: res.emailError ?? null,
      })
      .eq("id", data.id);
    return res;
  });
