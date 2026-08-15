import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Receipt, Users, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clientName, docTotals, money, useDemoState } from "@/lib/demo-store";

export const Route = createFileRoute("/try/")({
  head: () => ({
    meta: [
      { title: "Try WinStream Free — Demo Workspace, No Signup" },
      {
        name: "description",
        content:
          "Explore the full WinStream workspace with sample data. Create quotes, invoices and proposals with AI — no account or card needed.",
      },
      { property: "og:title", content: "Try WinStream Free — No Signup Demo" },
      {
        property: "og:description",
        content: "Test quotes, invoices and AI drafting in a live sandbox before you sign up.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoDashboard,
});

function DemoDashboard() {
  const state = useDemoState();
  const quotes = state.docs.filter((d) => d.type === "quote");
  const invoices = state.docs.filter((d) => d.type === "invoice");
  const outstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + docTotals(i).total, 0);

  const stats = [
    { label: "Clients", value: String(state.clients.length), icon: Users },
    { label: "Quotes", value: String(quotes.length), icon: FileText },
    { label: "Invoices", value: String(invoices.length), icon: Receipt },
    { label: "Outstanding", value: money(outstanding), icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome to the demo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This is the real WinStream interface loaded with sample data for{" "}
        <span className="font-medium text-foreground">{state.profile.businessName}</span>. Change
        anything you like — it never leaves your browser.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-semibold">Start with an AI draft</div>
              <p className="text-xs text-muted-foreground">
                Describe a job in one line and WinStream builds the line items, pricing and terms.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/demo/quotes">Create a quote</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.docs.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Nothing here yet.</p>
          )}
          {state.docs.slice(0, 6).map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">{d.number}</span>{" "}
                <span className="text-muted-foreground">· {clientName(state, d.clientId)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{d.status}</Badge>
                <span className="font-medium">{money(docTotals(d).total)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-sm text-muted-foreground">
            Ready to send real quotes and invoices to your clients?
          </p>
          <Button asChild variant="default">
            <Link to="/auth">Create your free account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
