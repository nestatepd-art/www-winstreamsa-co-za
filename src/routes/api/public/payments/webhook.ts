import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyWebhook, EventName, gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";

// Plan tier mapping — both Growth and Scale map to the "pro" plan; only the
// monthly credit grant differs.
const PLAN_FOR_PRICE: Record<string, { plan: "pro"; credits: number }> = {
  growth_monthly: { plan: "pro", credits: 500 },
  scale_monthly: { plan: "pro", credits: 2000 },
};

const CREDITS_FOR_PRICE: Record<string, number> = {
  credits_100: 100,
  credits_500: 500,
  credits_2000: 2000,
};

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function isActiveStatus(status: string) {
  return status === "active" || status === "trialing";
}

async function fetchPaddleCustomerEmail(env: PaddleEnv, customerId: string): Promise<string | null> {
  try {
    const res = await gatewayFetch(env, `/customers/${customerId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { email?: string } };
    return json.data?.email ?? null;
  } catch (e) {
    console.warn("Could not fetch Paddle customer email", customerId, e);
    return null;
  }
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = getSupabase();
  // auth.users isn't queryable via PostgREST; use the admin API.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error || !data?.users) return null;
  const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

/**
 * Apply a subscription tier to a user. On creation OR renewal, add the tier's
 * credit grant to the current balance (no max cap — previous logic skipped
 * the refill for users who still had credits).
 */
async function applyPlanFromSubscription(
  userId: string,
  priceId: string,
  status: string,
  opts: { addCredits: boolean },
) {
  const tier = PLAN_FOR_PRICE[priceId];
  const supabase = getSupabase();
  if (!tier || !isActiveStatus(status)) {
    await supabase.from("user_credits").update({ plan: "free" }).eq("user_id", userId);
    return;
  }
  const { data: row } = await supabase
    .from("user_credits")
    .select("credit_balance")
    .eq("user_id", userId)
    .maybeSingle();
  const currentBalance = Number((row as { credit_balance?: number } | null)?.credit_balance ?? 0);
  const newBalance = opts.addCredits ? currentBalance + tier.credits : currentBalance;
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
  if (opts.addCredits) {
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      delta: tier.credits,
      reason: `subscription_refill:${priceId}`,
    });
  }
}

async function recordPendingSubscription(
  email: string,
  data: { id: string; customerId: string; priceId: string; productId: string },
  env: PaddleEnv,
) {
  const tier = PLAN_FOR_PRICE[data.priceId];
  await getSupabase().from("pending_purchases").insert({
    email,
    kind: "subscription",
    plan: tier?.plan ?? "pro",
    credits: tier?.credits ?? 0,
    price_id: data.priceId,
    paddle_subscription_id: data.id,
    paddle_customer_id: data.customerId,
    environment: env,
  });
}

async function recordPendingTopup(
  email: string,
  data: { transactionId: string; customerId: string; credits: number; priceId: string },
  env: PaddleEnv,
) {
  await getSupabase().from("pending_purchases").insert({
    email,
    kind: "credits",
    credits: data.credits,
    price_id: data.priceId,
    paddle_transaction_id: data.transactionId,
    paddle_customer_id: data.customerId,
    environment: env,
  });
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const item = data.items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing importMeta.externalId");
    return;
  }

  let userId: string | null = data.customData?.userId ?? null;

  // Guest checkout: no userId in customData. Fall back to email lookup, or
  // record a pending row to be claimed on signup.
  if (!userId) {
    const email = await fetchPaddleCustomerEmail(env, data.customerId);
    if (email) {
      userId = await findUserIdByEmail(email);
      if (!userId) {
        await recordPendingSubscription(
          email,
          { id: data.id, customerId: data.customerId, priceId, productId },
          env,
        );
        console.log("Recorded pending subscription for", email);
        return;
      }
    } else {
      console.error("Subscription has no userId and no customer email", data.id);
      return;
    }
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
  await applyPlanFromSubscription(userId, priceId, data.status, { addCredits: true });
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const item = data.items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;

  // Detect a renewal: incoming period start is newer than what we have stored.
  const { data: existing } = await getSupabase()
    .from("subscriptions")
    .select("user_id, price_id, current_period_start")
    .eq("paddle_subscription_id", data.id)
    .maybeSingle();

  const incomingStart = data.currentBillingPeriod?.startsAt;
  const storedStart = (existing as { current_period_start?: string } | null)?.current_period_start;
  const isRenewal =
    !!incomingStart &&
    !!storedStart &&
    new Date(incomingStart).getTime() > new Date(storedStart).getTime();

  const update: {
    status: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end: boolean;
    updated_at: string;
    price_id?: string;
    product_id?: string;
  } = {
    status: data.status,
    current_period_start: incomingStart,
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

  if (existing) {
    const sub = existing as { user_id: string; price_id: string };
    const finalPriceId = priceId ?? sub.price_id;
    await applyPlanFromSubscription(sub.user_id, finalPriceId, data.status, {
      addCredits: isRenewal,
    });
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
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

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  if (data.subscriptionId) return; // Subscription invoices flow through the subscription handlers.

  let creditsToAdd = 0;
  let firstPackPriceId: string | null = null;
  for (const item of data.items ?? []) {
    const priceId = item.price?.importMeta?.externalId;
    if (priceId && CREDITS_FOR_PRICE[priceId]) {
      creditsToAdd += CREDITS_FOR_PRICE[priceId] * (item.quantity ?? 1);
      if (!firstPackPriceId) firstPackPriceId = priceId;
    }
  }
  if (creditsToAdd <= 0) return;

  let userId: string | null = data.customData?.userId ?? null;
  if (!userId) {
    const email = await fetchPaddleCustomerEmail(env, data.customerId);
    if (!email) {
      console.warn("transaction.completed without userId or email", data.id);
      return;
    }
    userId = await findUserIdByEmail(email);
    if (!userId) {
      await recordPendingTopup(
        email,
        {
          transactionId: data.id,
          customerId: data.customerId,
          credits: creditsToAdd,
          priceId: firstPackPriceId ?? "",
        },
        env,
      );
      console.log("Recorded pending top-up for", email);
      return;
    }
  }

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
      await handleTransactionCompleted(event.data, env);
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
