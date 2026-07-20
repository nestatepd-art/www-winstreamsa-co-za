import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCreditStatus, consumeQuota } from "@/lib/billing.functions";
import { QUOTA_LABEL, type QuotaKind } from "@/lib/billing.constants";
import { toast } from "sonner";

export function useCreditStatus() {
  const fn = useServerFn(getCreditStatus);
  return useQuery({
    queryKey: ["credit-status"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });
}

/**
 * Returns a function that consumes a quota item. Resolves to true on success,
 * false on denial (and triggers an upgrade toast). Invalidates credit-status.
 */
export function useConsumeQuota() {
  const consume = useServerFn(consumeQuota);
  const qc = useQueryClient();

  return async (kind: QuotaKind, relatedId?: string): Promise<boolean> => {
    try {
      const res = await consume({ data: { kind, relatedId } });
      qc.invalidateQueries({ queryKey: ["credit-status"] });
      if (!res.ok) {
        toast.error(
          `${QUOTA_LABEL[kind]} limit reached for this month`,
          {
            description: `Redirecting to billing… Cost: ${res.cost} credit${res.cost === 1 ? "" : "s"}.`,
          },
        );
        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.href = "/billing";
          }, 800);
        }
        return false;
      }
      if (res.charged && res.charged > 0) {
        toast.success(`Used ${res.charged} credit${res.charged === 1 ? "" : "s"}`, {
          description: `Balance: ${res.balance} credits remaining.`,
        });
      }
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not check credits");
      return false;
    }
  };
}
