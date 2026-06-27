import { useState } from "react";
import { toast } from "sonner";
import { initializePaddle, getPaddlePriceId, isCheckoutAvailable } from "@/lib/paddle";

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: {
    priceId: string;
    quantity?: number;
    customerEmail?: string;
    customData?: Record<string, string>;
    successUrl?: string;
  }) => {
    setLoading(true);
    try {
      if (!isCheckoutAvailable()) {
        toast.info("Checkout opens soon", {
          description:
            "We're finalising payment verification. Purchases will be enabled shortly — thanks for your patience.",
        });
        return;
      }
      await initializePaddle();
      let paddlePriceId: string;
      try {
        paddlePriceId = await getPaddlePriceId(options.priceId);
      } catch (err) {
        console.error("Paddle price lookup failed:", options.priceId, err);
        toast.error("Couldn't load that plan", {
          description:
            "Our payment provider didn't recognise this product. Please refresh or contact support if it persists.",
        });
        return;
      }
      import("@/lib/analytics").then(({ track }) =>
        track("checkout_started", { price_id: options.priceId, quantity: options.quantity ?? 1 }),
      );
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: options.quantity ?? 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.customData,
        settings: {
          displayMode: "overlay",
          successUrl: options.successUrl || `${window.location.origin}/billing?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (err) {
      console.error("Paddle checkout failed to open:", err);
      toast.error("Checkout failed to open", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
