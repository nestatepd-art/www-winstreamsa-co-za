import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { FREE_LIMITS, CREDIT_COST, type QuotaKind } from "./billing.constants";

async function callInit(supabase: any) {
  const { data, error } = await supabase.rpc("init_user_credits");
  if (error) throw new Error(error.message);
  return data;
}

export const getCreditStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await callInit(context.supabase);
    return {
      plan: row.plan as "free" | "pro",
      period_start: row.period_start as string,
      quotes_used: row.quotes_used as number,
      proposals_used: row.proposals_used as number,
      ai_drafts_used: row.ai_drafts_used as number,
      credit_balance: row.credit_balance as number,
      limits: FREE_LIMITS,
      costs: CREDIT_COST,
    };
  });

export const consumeQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      kind: z.enum(["quote", "proposal", "ai_draft"]),
      relatedId: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("consume_quota", {
      _kind: data.kind as QuotaKind,
      _related_id: data.relatedId ?? null,
    });
    if (error) throw new Error(error.message);
    if (res.limit === null) res.limit = Infinity;
    return res;
  });

export const topUpCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ credits: z.number().int().min(1).max(10000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: balance, error } = await context.supabase.rpc("topup_credits", {
      _credits: data.credits,
    });
    if (error) throw new Error(error.message);
    return { balance };
  });

export const setPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ plan: z.enum(["free", "pro"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: plan, error } = await context.supabase.rpc("set_user_plan", {
      _plan: data.plan,
    });
    if (error) throw new Error(error.message);
    return { plan };
  });

export const listCreditTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("id, delta, reason, related_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
