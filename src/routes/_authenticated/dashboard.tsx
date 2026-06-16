import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, TrendingUp, Plus, ArrowRight, Sparkles } from "lucide-react";
import { formatZAR, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [{ data: profile }, { data: quotes }, { count: clientCount }] = await Promise.all([
        supabase.from("business_profiles").select("business_name").maybeSingle(),
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
              body="Create your first quote — VukaFlow drafts the descriptions for you."
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
