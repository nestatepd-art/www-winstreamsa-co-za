import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { FileText, Users, TrendingUp, Plus, ArrowRight, Sparkles, Check, FileSignature, Receipt, BellRing, MessageSquare, CreditCard, Settings } from "lucide-react";
import { formatZAR, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const [{ data: profile }, { data: quotes }, { count: clientCount }] = await Promise.all([
        supabase.from("business_profiles").select("business_name, email, phone, address_line1, city").maybeSingle(),
        supabase.from("quotes").select("id, quote_number, title, status, total, created_at, client_id, clients(name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("clients").select("id", { count: "exact", head: true }),
      ]);
      const { data: allQuotes } = await supabase.from("quotes").select("status, total");
      const accepted = (allQuotes ?? []).filter((q) => q.status === "accepted");
      const pending = (allQuotes ?? []).filter((q) => ["sent", "viewed"].includes(q.status as string));
      const acceptedValue = accepted.reduce((s, q) => s + Number(q.total ?? 0), 0);
      const pendingValue = pending.reduce((s, q) => s + Number(q.total ?? 0), 0);
      return {
        businessName: profile?.business_name || "Your business",
        profileComplete: Boolean(
          profile?.business_name && profile?.email && profile?.phone && profile?.address_line1 && profile?.city,
        ),
        recentQuotes: quotes ?? [],
        clientCount: clientCount ?? 0,
        quoteCount: (allQuotes ?? []).length,
        acceptedValue,
        pendingValue,
      };
    },
  });


  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            {stats?.businessName ?? "Loading…"}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your work overview — quotes, clients, and pipeline value.
          </p>
        </div>
        <Button asChild>
          <Link to="/quotes/new"><Plus className="h-4 w-4 mr-1" /> New quote</Link>
        </Button>
      </header>

      {stats && stats.quoteCount === 0 && (
        <OnboardingChecklist
          profileComplete={stats.profileComplete}
          hasClient={stats.clientCount > 0}
        />
      )}



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Quotes" value={String(stats?.quoteCount ?? 0)} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Clients" value={String(stats?.clientCount ?? 0)} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Pipeline" value={formatZAR(stats?.pendingValue ?? 0)} hint="Sent & viewed quotes" />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Won" value={formatZAR(stats?.acceptedValue ?? 0)} hint="Accepted quotes" tone="success" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent quotes</CardTitle>
            <CardDescription>Your last 5 quotes</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/quotes">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recentQuotes?.length === 0 ? (
            <EmptyState
              title="No quotes yet"
              body="Create your first quote — WinStream drafts the descriptions for you."
              action={<Button asChild><Link to="/quotes/new"><Plus className="h-4 w-4 mr-1" /> New quote</Link></Button>}
            />
          ) : (
            <div className="divide-y divide-border">
              {stats?.recentQuotes?.map((q: any) => (
                <Link
                  key={q.id}
                  to="/quotes/$quoteId"
                  params={{ quoteId: q.id }}
                  className="flex items-center justify-between py-3 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{q.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {q.quote_number} · {q.clients?.name ?? "No client"} · {formatDate(q.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <QuoteStatusBadge status={q.status} />
                    <div className="font-medium text-sm tabular-nums">{formatZAR(q.total)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const WORKSPACE_FEATURES = [
  { label: "Clients", hint: "Your contact book", to: "/clients", icon: Users },
  { label: "Proposals", hint: "Win the work", to: "/proposals", icon: FileSignature },
  { label: "Quotes", hint: "AI-drafted, branded", to: "/quotes", icon: FileText },
  { label: "Invoices", hint: "Get paid faster", to: "/invoices", icon: Receipt },
  { label: "Reminders", hint: "Auto follow-ups", to: "/reminders", icon: BellRing },
  { label: "Assist", hint: "Ask WinStream AI", to: "/chat", icon: MessageSquare },
  { label: "Billing", hint: "Plan & credits", to: "/billing", icon: CreditCard },
  { label: "Settings", hint: "Logo, VAT, banking", to: "/settings", icon: Settings },
] as const;

function OnboardingChecklist({ profileComplete, hasClient }: { profileComplete: boolean; hasClient: boolean }) {
  const steps = [
    { label: "Complete your business profile", hint: "Logo, VAT number and banking details", to: "/settings", cta: "Open settings", done: profileComplete },
    { label: "Add your first client", hint: "Save contact details once, reuse everywhere", to: "/clients", cta: "Add a client", done: hasClient },
    { label: "Create your first quote", hint: "Let AI draft the line items for you", to: "/quotes/new", cta: "New quote", done: false },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const targetIndex = Math.min(steps.findIndex((s) => !s.done) === -1 ? steps.length - 1 : steps.findIndex((s) => !s.done), steps.length - 1);
  // Panel 3 is the workspace menu, shown once the first two steps are done.
  const targetPanel = profileComplete && hasClient ? 3 : targetIndex;

  const [panel, setPanel] = useState(targetPanel);

  useEffect(() => {
    if (panel === targetPanel) return;
    const t = setTimeout(() => setPanel(targetPanel), 550);
    return () => clearTimeout(t);
  }, [targetPanel, panel]);

  const panels = [0, 1, 2, 3];

  return (
    <Card className="border-primary/25 bg-primary/5 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Get set up
        </CardTitle>
        <CardDescription>
          {doneCount} of {steps.length} done — finish these to send your first professional quote.
        </CardDescription>
        <div className="flex items-center gap-1.5 pt-2">
          {panels.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={i === 3 ? "Show workspace menu" : `Show step ${i + 1}`}
              onClick={() => setPanel(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                panel === i ? "w-8 bg-primary" : "w-3 bg-primary/25 hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${panel * 100}%)` }}
          >
            {steps.map((step, i) => (
              <div key={step.label} className="w-full shrink-0 px-0.5">
                <div className="rounded-lg border border-border/60 bg-card/60 p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                        step.done
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium ${step.done ? "text-primary" : "text-foreground"}`}>
                        {step.label}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.hint}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button asChild size="sm" variant={step.done ? "outline" : "default"}>
                      <Link
                        to={step.to}
                        onClick={() => {
                          try { sessionStorage.setItem("ws-setup", "1"); } catch {}
                        }}
                      >
                        {step.done ? "Review" : step.cta} <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}


            <div className="w-full shrink-0 px-0.5">
              <div className="rounded-lg border border-border/60 bg-card/60 p-4">
                <div className="text-sm font-medium">You're set up — here's everything you can do</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Every feature is also in the left menu, any time.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {WORKSPACE_FEATURES.map((f) => (
                    <Link
                      key={f.label}
                      to={f.to}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2.5 hover:bg-muted/50 hover:border-primary/40 transition-colors"
                    >
                      <f.icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium truncate">{f.label}</span>
                        <span className="block text-[10px] text-muted-foreground truncate">{f.hint}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



function StatCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: "success" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
          <span>{label}</span>
          <span className={tone === "success" ? "text-success" : "text-muted-foreground"}>{icon}</span>
        </div>
        <div className="text-2xl font-semibold tracking-tight mt-2 tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function QuoteStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    sent: { label: "Sent", cls: "bg-primary/10 text-primary" },
    viewed: { label: "Viewed", cls: "bg-accent text-accent-foreground" },
    accepted: { label: "Accepted", cls: "bg-success/15 text-success" },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive" },
    expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? map.draft;
  return <Badge variant="outline" className={`border-transparent ${s.cls}`}>{s.label}</Badge>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-border rounded-lg">
      <div className="font-medium">{title}</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
