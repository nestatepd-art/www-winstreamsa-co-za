import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

// Plan tier mapping — keep in sync with batch_create_product IDs.
const PLAN_FOR_PRICE: Record<string, { plan: "pro"; credits: number }> = {
  growth_monthly: { plan: "pro", credits: 500 },
  scale_monthly: { plan: "pro", credits: 2000 },
};

const CREDITS_FOR_PRICE: Record<string, number> = {
  credits_100: 100,
  credits_500: 500,
  credits_2000: 2000,
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function isActiveStatus(status: string) {
  return status === "active" || status === "trialing";
}

async function applyPlanFromSubscription(userId: string, priceId: string, status: string) {
  const tier = PLAN_FOR_PRICE[priceId];
  const supabase = getSupabase();
  if (!tier || !isActiveStatus(status)) {
    // Downgrade to free for canceled/past_due/paused
    await supabase.from("user_credits").update({ plan: "free" }).eq("user_id", userId);
    return;
  }
  // Active: set plan=pro, top-up credits to (at least) the tier amount, reset month counters.
  const { data: row } = await supabase
    .from("user_credits")
    .select("credit_balance")
    .eq("user_id", userId)
    .maybeSingle();
  const currentBalance = Number((row as { credit_balance?: number } | null)?.credit_balance ?? 0);
  const newBalance = Math.max(currentBalance, tier.credits);
  await supabase
    .from("user_credits")
    .update({
      plan: tier.plan,
      credit_balance: newBalance,
      quotes_used: 0,
      proposals_used: 0,
      ai_drafts_used: 0,
    })
    .eq("user_id", userId);
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    delta: newBalance - currentBalance,
    reason: `subscription_refill:${priceId}`,
  });
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const userId = data.customData?.userId;
  if (!userId) {
    console.error("No userId in customData for subscription", data.id);
    return;
  }
  const item = data.items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing importMeta.externalId");
    return;
  }
  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        paddle_subscription_id: data.id,
        paddle_customer_id: data.customerId,
        product_id: productId,
        price_id: priceId,
        status: data.status,
        current_period_start: data.currentBillingPeriod?.startsAt,
        current_period_end: data.currentBillingPeriod?.endsAt,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paddle_subscription_id" },
    );
  await applyPlanFromSubscription(userId, priceId, data.status);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const item = data.items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;

  const update: Record<string, unknown> = {
    status: data.status,
    current_period_start: data.currentBillingPeriod?.startsAt,
    current_period_end: data.currentBillingPeriod?.endsAt,
    cancel_at_period_end: data.scheduledChange?.action === "cancel",
    updated_at: new Date().toISOString(),
  };
  if (priceId) update.price_id = priceId;
  if (productId) update.product_id = productId;

  await getSupabase()
    .from("subscriptions")
    .update(update)
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);

  // Re-apply plan in case of upgrade/downgrade or status change.
  const { data: sub } = await getSupabase()
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("paddle_subscription_id", data.id)
    .maybeSingle();
  if (sub) {
    const s = sub as { user_id: string; price_id: string };
    await applyPlanFromSubscription(s.user_id, s.price_id, data.status);
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
  // Immediate downgrade per user policy.
  const { data: sub } = await getSupabase()
    .from("subscriptions")
    .select("user_id")
    .eq("paddle_subscription_id", data.id)
    .maybeSingle();
  if (sub) {
    await getSupabase()
      .from("user_credits")
      .update({ plan: "free" })
      .eq("user_id", (sub as { user_id: string }).user_id);
  }
}

async function handleTransactionCompleted(data: any) {
  // One-time credit-pack purchases. Subscriptions also fire this; ignore them.
  if (data.subscriptionId) return;
  const userId = data.customData?.userId;
  if (!userId) {
    console.warn("transaction.completed without userId", data.id);
    return;
  }
  let creditsToAdd = 0;
  for (const item of data.items ?? []) {
    const priceId = item.price?.importMeta?.externalId;
    if (priceId && CREDITS_FOR_PRICE[priceId]) {
      creditsToAdd += CREDITS_FOR_PRICE[priceId] * (item.quantity ?? 1);
    }
  }
  if (creditsToAdd <= 0) return;
  const supabase = getSupabase();
  const { data: row } = await supabase
    .from("user_credits")
    .select("credit_balance")
    .eq("user_id", userId)
    .maybeSingle();
  const current = Number((row as { credit_balance?: number } | null)?.credit_balance ?? 0);
  await supabase
    .from("user_credits")
    .update({ credit_balance: current + creditsToAdd })
    .eq("user_id", userId);
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    delta: creditsToAdd,
    reason: `topup:paddle:${data.id}`,
  });
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data);
      break;
    default:
      console.log("Unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
