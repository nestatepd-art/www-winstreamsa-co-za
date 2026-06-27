import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCreditStatus,
  listCreditTransactions,
} from "@/lib/billing.functions";
import { createPortalSession } from "@/lib/portal.functions";
import {
  FREE_LIMITS,
  CREDIT_COST,
  CREDIT_PACKS,
  GROWTH_PRICE_ZAR,
  SCALE_PRICE_ZAR,
  QUOTA_LABEL,
  type QuotaKind,
} from "@/lib/billing.constants";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Sparkles, Zap, Loader2, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { getPaddleEnvironment } from "@/lib/paddle";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

function BillingPage() {
  const fetchStatus = useServerFn(getCreditStatus);
  const fetchTx = useServerFn(listCreditTransactions);
  const portal = useServerFn(createPortalSession);
  const qc = useQueryClient();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const env = getPaddleEnvironment();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? undefined });
    });
  }, []);

  const { data: status } = useQuery({
    queryKey: ["credit-status"],
    queryFn: () => fetchStatus(),
  });
  const { data: tx } = useQuery({
    queryKey: ["credit-tx"],
    queryFn: () => fetchTx(),
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", env],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const buy = (priceId: string) => {
    if (!user) return;
    openCheckout({
      priceId,
      customerEmail: user.email,
      customData: { userId: user.id },
      successUrl: `${window.location.origin}/billing?checkout=success`,
    });
  };

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const res = await portal({ data: { environment: env } });
      const url = res.generalUrl || res.cancelUrl || res.updatePaymentUrl;
      if (!url) throw new Error("No portal URL returned");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalBusy(false);
    }
  };

  // Auto-refresh after checkout success
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") === "success") {
      toast.success("Payment received — your account will update in a moment.");
      import("@/lib/analytics").then(({ track }) => track("credits_purchased"));
      const t = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["credit-status"] });
        qc.invalidateQueries({ queryKey: ["credit-tx"] });
        qc.invalidateQueries({ queryKey: ["subscription", env] });
      }, 3000);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
      return () => clearTimeout(t);
    }
  }, [qc, env]);

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

  const subActive = subscription && ["active", "trialing", "past_due"].includes(subscription.status);
  const isScale = subscription?.price_id === "scale_monthly";

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Billing & usage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          You're on the{" "}
          <strong>
            {status.plan === "pro" ? (isScale ? "Scale" : "Growth") : "Free"}
          </strong>{" "}
          plan. Period started {new Date(status.period_start).toLocaleDateString()}.
        </p>
        {subscription?.cancel_at_period_end && (
          <p className="text-xs text-amber-600 mt-1">
            Cancellation scheduled — access continues until{" "}
            {subscription.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString()
              : "the end of the period"}
            .
          </p>
        )}
      </header>

      {/* Usage this month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage this period</CardTitle>
          <CardDescription>
            {status.plan === "pro"
              ? "Paid plan — usage included in your monthly credit grant."
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

      {/* Subscription management */}
      {subActive ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your subscription</CardTitle>
            <CardDescription>
              Manage payment method, view invoices, or cancel via the secure billing portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Status: <strong className="text-foreground capitalize">{subscription?.status}</strong>
              {subscription?.current_period_end && (
                <>
                  {" · "}Renews{" "}
                  <strong className="text-foreground">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </strong>
                </>
              )}
            </div>
            <Button onClick={openPortal} disabled={portalBusy} variant="outline">
              {portalBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Open billing portal
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={status.plan === "free" ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Free</CardTitle>
              {status.plan === "free" && <Badge variant="secondary">Current</Badge>}
            </div>
            <CardDescription>Try the core automations.</CardDescription>
            <div className="text-3xl font-bold pt-2">R0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> {FREE_LIMITS.quote} quotes / month</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> {FREE_LIMITS.proposal} proposal / month</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> {FREE_LIMITS.ai_draft} AI drafts / month</li>
            </ul>
          </CardContent>
        </Card>

        <Card className={status.plan === "pro" && !isScale ? "border-primary" : "border-primary/40"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Growth
              </CardTitle>
              {status.plan === "pro" && !isScale ? <Badge>Current</Badge> : <Badge variant="outline">Popular</Badge>}
            </div>
            <CardDescription>Active SMEs sending weekly quotes.</CardDescription>
            <div className="text-3xl font-bold pt-2">{formatZAR(GROWTH_PRICE_ZAR)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> 500 AI credits / month</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> WhatsApp + email follow-ups</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> 3 users · Priority support</li>
            </ul>
            {!subActive && (
              <Button className="w-full" disabled={checkoutLoading} onClick={() => buy("growth_monthly")}>
                {checkoutLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Subscribe to Growth
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={isScale ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Scale
              </CardTitle>
              {isScale && <Badge>Current</Badge>}
            </div>
            <CardDescription>Growing teams with custom workflows.</CardDescription>
            <div className="text-3xl font-bold pt-2">{formatZAR(SCALE_PRICE_ZAR)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> 2,000 AI credits / month</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Unlimited users · API access</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Custom branding · Dedicated onboarding</li>
            </ul>
            {!subActive && (
              <Button className="w-full" variant="outline" disabled={checkoutLoading} onClick={() => buy("scale_monthly")}>
                {checkoutLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Subscribe to Scale
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
            One-time top-ups. Credits never expire. Proposals cost {CREDIT_COST.proposal} credits each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {CREDIT_PACKS.map((p) => (
              <div
                key={p.priceId}
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
                  disabled={checkoutLoading}
                  onClick={() => buy(p.priceId)}
                >
                  {checkoutLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
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
        Need a custom plan? <Link to="/contact" className="underline">Contact us</Link>.
      </p>
    </div>
  );
}
