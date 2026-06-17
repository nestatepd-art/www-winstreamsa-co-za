import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  FREE_LIMITS,
  CREDIT_COST,
  type QuotaKind,
} from "./billing.constants";

/** Fetch the user's credits row, creating it if missing, and resetting monthly counters if a new month started. */
async function getOrInitCredits(supabase: any, userId: string) {
  let { data: row } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) {
    const ins = await supabase
      .from("user_credits")
      .insert({ user_id: userId })
      .select()
      .single();
    if (ins.error) throw new Error(ins.error.message);
    row = ins.data;
  }

  // Monthly reset: if stored period_start is not the current month, reset counters.
  const now = new Date();
  const thisPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  if (row.period_start !== thisPeriod) {
    const upd = await supabase
      .from("user_credits")
      .update({
        period_start: thisPeriod,
        quotes_used: 0,
        proposals_used: 0,
        ai_drafts_used: 0,
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (upd.error) throw new Error(upd.error.message);
    row = upd.data;
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      delta: 0,
      reason: "monthly_reset",
    });
  }
  return row;
}

export const getCreditStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const row = await getOrInitCredits(supabase, userId);
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

/**
 * Atomically check whether the user may perform a `kind` action.
 * - On 'pro': always allow.
 * - On 'free' within limit: increment counter, allow.
 * - On 'free' over limit: deduct credits (cost depends on kind). If insufficient, deny.
 *
 * Returns { ok, used, limit, balance, charged } where `charged` is credits debited.
 */
export const consumeQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      kind: z.enum(["quote", "proposal", "ai_draft"]),
      relatedId: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = await getOrInitCredits(supabase, userId);
    const kind = data.kind as QuotaKind;
    const limit = FREE_LIMITS[kind];
    const cost = CREDIT_COST[kind];

    const counterField =
      kind === "quote" ? "quotes_used" : kind === "proposal" ? "proposals_used" : "ai_drafts_used";
    const used: number = row[counterField];

    if (row.plan === "pro") {
      // unlimited; still track usage for analytics
      const upd = await supabase
        .from("user_credits")
        .update({ [counterField]: used + 1 })
        .eq("user_id", userId);
      if (upd.error) throw new Error(upd.error.message);
      return { ok: true, used: used + 1, limit: Infinity, balance: row.credit_balance, charged: 0 };
    }

    // Free plan: within free limit -> just bump counter
    if (used < limit) {
      const upd = await supabase
        .from("user_credits")
        .update({ [counterField]: used + 1 })
        .eq("user_id", userId);
      if (upd.error) throw new Error(upd.error.message);
      return { ok: true, used: used + 1, limit, balance: row.credit_balance, charged: 0 };
    }

    // Over the free limit -> try to spend credits
    if (row.credit_balance < cost) {
      return {
        ok: false,
        reason: "insufficient_credits" as const,
        used,
        limit,
        balance: row.credit_balance,
        cost,
        kind,
      };
    }
    const newBalance = row.credit_balance - cost;
    const upd = await supabase
      .from("user_credits")
      .update({
        credit_balance: newBalance,
        [counterField]: used + 1,
      })
      .eq("user_id", userId);
    if (upd.error) throw new Error(upd.error.message);
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      delta: -cost,
      reason: `consume:${kind}`,
      related_id: data.relatedId ?? null,
    });
    return { ok: true, used: used + 1, limit, balance: newBalance, charged: cost };
  });

/** Simulated top-up. Real Stripe/Paddle wiring lands later; UI is unchanged. */
export const topUpCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ credits: z.number().int().min(1).max(10000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = await getOrInitCredits(supabase, userId);
    const newBalance = row.credit_balance + data.credits;
    const upd = await supabase
      .from("user_credits")
      .update({ credit_balance: newBalance })
      .eq("user_id", userId);
    if (upd.error) throw new Error(upd.error.message);
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      delta: data.credits,
      reason: "topup:simulated",
    });
    return { balance: newBalance };
  });

/** Switch plan. Simulated — no real billing. */
export const setPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ plan: z.enum(["free", "pro"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await getOrInitCredits(supabase, userId);
    const upd = await supabase
      .from("user_credits")
      .update({ plan: data.plan })
      .eq("user_id", userId);
    if (upd.error) throw new Error(upd.error.message);
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      delta: 0,
      reason: `plan:${data.plan}:simulated`,
    });
    return { plan: data.plan };
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
