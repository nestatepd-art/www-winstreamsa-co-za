import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCreditStatus,
  topUpCredits,
  setPlan,
  listCreditTransactions,
} from "@/lib/billing.functions";
import {
  FREE_LIMITS,
  CREDIT_COST,
  CREDIT_PACKS,
  PRO_PRICE_ZAR,
  QUOTA_LABEL,
  type QuotaKind,
} from "@/lib/billing.constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Sparkles, Zap, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

function BillingPage() {
  const fetchStatus = useServerFn(getCreditStatus);
  const fetchTx = useServerFn(listCreditTransactions);
  const topUp = useServerFn(topUpCredits);
  const changePlan = useServerFn(setPlan);
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["credit-status"],
    queryFn: () => fetchStatus(),
  });
  const { data: tx } = useQuery({
    queryKey: ["credit-tx"],
    queryFn: () => fetchTx(),
  });
  const [busy, setBusy] = useState<string | null>(null);

  const handleBuy = async (credits: number, label: string) => {
    setBusy(label);
    try {
      const res = await topUp({ data: { credits } });
      toast.success(`+${credits} credits added (simulated)`, {
        description: `New balance: ${res.balance}`,
      });
      qc.invalidateQueries({ queryKey: ["credit-status"] });
      qc.invalidateQueries({ queryKey: ["credit-tx"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(null);
    }
  };

  const handlePlan = async (plan: "free" | "pro") => {
    setBusy(`plan:${plan}`);
    try {
      await changePlan({ data: { plan } });
      toast.success(plan === "pro" ? "Upgraded to Pro (simulated)" : "Switched to Free");
      qc.invalidateQueries({ queryKey: ["credit-status"] });
      qc.invalidateQueries({ queryKey: ["credit-tx"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not switch plan");
    } finally {
      setBusy(null);
    }
  };

  if (!status) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const usageRows: { key: QuotaKind; used: number }[] = [
    { key: "quote", used: status.quotes_used },
    { key: "proposal", used: status.proposals_used },
    { key: "ai_draft", used: status.ai_drafts_used },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Billing & usage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          You're on the <strong>{status.plan === "pro" ? "Pro" : "Free"}</strong> plan.
          Period started {new Date(status.period_start).toLocaleDateString()}.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Payments are <em>simulated</em> for now — no card is charged. Real Stripe / Paddle wires in next.
        </p>
      </header>

      {/* Usage this month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage this month</CardTitle>
          <CardDescription>
            {status.plan === "pro"
              ? "Pro plan — unlimited usage on everything."
              : "Free includes the limits below. Overflow uses credits."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usageRows.map((r) => {
            const limit = FREE_LIMITS[r.key];
            const pct = status.plan === "pro" ? 0 : Math.min(100, (r.used / limit) * 100);
            return (
              <div key={r.key} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{QUOTA_LABEL[r.key]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {r.used}
                    {status.plan === "free" ? ` / ${limit}` : ""}
                    {status.plan === "free" && r.used >= limit && (
                      <span className="text-destructive ml-2">over — costs {CREDIT_COST[r.key]} cr/action</span>
                    )}
                  </span>
                </div>
                {status.plan === "free" && <Progress value={pct} className="h-1.5" />}
              </div>
            );
          })}
          <div className="pt-2 border-t border-border flex justify-between items-center">
            <span className="text-sm font-medium">Credit balance</span>
            <span className="tabular-nums text-lg font-semibold">{status.credit_balance}</span>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className={status.plan === "free" ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Free</CardTitle>
              {status.plan === "free" && <Badge variant="secondary">Current</Badge>}
            </div>
            <CardDescription>Run real work, prove value.</CardDescription>
            <div className="text-3xl font-bold pt-2">R0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> {FREE_LIMITS.quote} quotes / month</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> {FREE_LIMITS.proposal} proposal / month</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> {FREE_LIMITS.ai_draft} AI drafts / month</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Buy credits for overflow</li>
            </ul>
            {status.plan === "pro" && (
              <Button variant="outline" className="w-full" disabled={busy === "plan:free"} onClick={() => handlePlan("free")}>
                {busy === "plan:free" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Switch to Free
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={status.plan === "pro" ? "border-primary" : "border-primary/40"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Pro
              </CardTitle>
              {status.plan === "pro" ? <Badge>Current</Badge> : <Badge variant="outline">Best value</Badge>}
            </div>
            <CardDescription>Unlimited, predictable.</CardDescription>
            <div className="text-3xl font-bold pt-2">{formatZAR(PRO_PRICE_ZAR)}<span className="text-sm font-normal text-muted-foreground">/user/mo</span></div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Unlimited quotes, proposals, AI drafts</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Priority AI model access</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Real Gmail & WhatsApp sending (when live)</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Email support</li>
            </ul>
            {status.plan === "free" && (
              <Button className="w-full" disabled={busy === "plan:pro"} onClick={() => handlePlan("pro")}>
                {busy === "plan:pro" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upgrade to Pro
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credit packs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Buy credits
          </CardTitle>
          <CardDescription>
            1 credit = 1 quote or AI draft over the free limit. Proposals cost {CREDIT_COST.proposal} credits each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {CREDIT_PACKS.map((p) => (
              <div
                key={p.label}
                className={`rounded-lg border p-4 space-y-2 ${p.popular ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.label}</span>
                  {p.popular && <Badge>Popular</Badge>}
                </div>
                <div className="text-2xl font-bold tabular-nums">{p.credits}<span className="text-sm text-muted-foreground font-normal"> credits</span></div>
                <div className="text-sm text-muted-foreground">{formatZAR(p.price_zar)} once-off</div>
                <Button
                  size="sm"
                  variant={p.popular ? "default" : "outline"}
                  className="w-full"
                  disabled={busy === p.label}
                  onClick={() => handleBuy(p.credits, p.label)}
                >
                  {busy === p.label && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Buy
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {(!tx || tx.length === 0) ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {tx.map((t) => (
                <li key={t.id} className="py-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{t.reason.replace(/[:_]/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`tabular-nums font-semibold ${t.delta > 0 ? "text-primary" : t.delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {t.delta > 0 ? "+" : ""}{t.delta}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Need a custom plan or team pricing? <Link to="/settings" className="underline">Contact us</Link>.
      </p>
    </div>
  );
}
