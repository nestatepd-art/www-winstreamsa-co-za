import { Link } from "@tanstack/react-router";
import { useCreditStatus } from "@/hooks/use-credits";
import { Progress } from "@/components/ui/progress";
import { FREE_LIMITS } from "@/lib/billing.constants";
import { Sparkles } from "lucide-react";

interface Props {
  collapsed?: boolean;
}

export function CreditMeter({ collapsed }: Props) {
  const { data } = useCreditStatus();
  if (!data) return null;

  if (data.plan === "pro") {
    if (collapsed) return null;
    return (
      <Link
        to="/billing"
        className="mx-2 mb-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 p-2 text-xs hover:bg-sidebar-accent"
      >
        <div className="flex items-center gap-1.5 font-medium">
          <Sparkles className="h-3 w-3" /> Pro plan
        </div>
        <div className="text-muted-foreground mt-0.5">Unlimited usage</div>
      </Link>
    );
  }

  // Free plan: show usage for the tightest of the three
  const items = [
    { key: "quote", used: data.quotes_used, limit: FREE_LIMITS.quote, label: "Quotes" },
    { key: "proposal", used: data.proposals_used, limit: FREE_LIMITS.proposal, label: "Proposals" },
    { key: "ai_draft", used: data.ai_drafts_used, limit: FREE_LIMITS.ai_draft, label: "AI drafts" },
  ];
  const tightest = items.reduce((a, b) =>
    b.used / b.limit > a.used / a.limit ? b : a,
  );
  const pct = Math.min(100, Math.round((tightest.used / tightest.limit) * 100));

  if (collapsed) {
    return (
      <Link
        to="/billing"
        className="mx-1 mb-2 grid place-items-center rounded-md p-1.5 hover:bg-sidebar-accent"
        title={`${tightest.label}: ${tightest.used}/${tightest.limit}`}
      >
        <div className="text-[10px] font-medium tabular-nums">{pct}%</div>
      </Link>
    );
  }

  return (
    <Link
      to="/billing"
      className="mx-2 mb-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 p-2 text-xs space-y-1.5 hover:bg-sidebar-accent transition-colors block"
    >
      <div className="flex items-center justify-between font-medium">
        <span>Free plan</span>
        <span className="text-muted-foreground tabular-nums">{data.credit_balance} credits</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-muted-foreground text-[11px]">
          <span>{tightest.label}</span>
          <span className="tabular-nums">{tightest.used}/{tightest.limit}</span>
        </div>
        <Progress value={pct} className="h-1" />
      </div>
      <div className="text-[10px] text-muted-foreground pt-0.5">
        Tap to upgrade or buy credits
      </div>
    </Link>
  );
}
