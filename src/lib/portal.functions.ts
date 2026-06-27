import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";
import { z } from "zod";

/**
 * Returns a fresh Paddle customer-portal URL for the calling user's active
 * (or most recent) subscription. The user can cancel, update card, view
 * invoices there. Open in a new tab on the client — Paddle blocks iframe embeds.
 */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("paddle_subscription_id, paddle_customer_id, environment")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) throw new Error("No subscription found for this account");

    const paddle = getPaddleClient(data.environment as PaddleEnv);
    const session = await paddle.customerPortalSessions.create(
      sub.paddle_customer_id,
      [sub.paddle_subscription_id],
    );
    const subEntry = session.urls?.subscriptions?.[0];
    return {
      generalUrl: session.urls?.general?.overview ?? null,
      cancelUrl: subEntry?.cancelSubscription ?? null,
      updatePaymentUrl: subEntry?.updateSubscriptionPaymentMethod ?? null,
    };
  });

export const claimPendingPurchases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_pending_purchases");
    if (error) throw new Error(error.message);
    return { claimed: (data as number) ?? 0 };
  });
