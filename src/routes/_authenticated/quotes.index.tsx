import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { formatZAR, formatDate } from "@/lib/format";
import { QuoteStatusBadge, EmptyState } from "./dashboard";

export const Route = createFileRoute("/_authenticated/quotes/")({
  component: QuotesPage,
});

function QuotesPage() {
  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, title, status, total, created_at, expiry_date, client_id, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground text-sm mt-1">Drafts, sent quotes and what's been accepted.</p>
        </div>
        <Button asChild><Link to="/quotes/new"><Plus className="h-4 w-4 mr-1" /> New quote</Link></Button>
      </header>

      {quotes.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          body="Build your first quote — WinStream drafts the descriptions, computes VAT (15%), and gives you a shareable link."
          action={<Button asChild><Link to="/quotes/new"><Plus className="h-4 w-4 mr-1" /> New quote</Link></Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="col-span-2">Number</div>
                <div className="col-span-4">Title / Client</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {quotes.map((q: any) => (
                <Link
                  key={q.id}
                  to="/quotes/$quoteId"
                  params={{ quoteId: q.id }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/40 transition-colors items-center"
                >
                  <div className="col-span-2 text-sm font-mono text-muted-foreground">{q.quote_number}</div>
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium truncate">{q.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{q.clients?.name ?? "No client"}</div>
                  </div>
                  <div className="col-span-2"><QuoteStatusBadge status={q.status} /></div>
                  <div className="col-span-2 text-sm text-muted-foreground">{formatDate(q.created_at)}</div>
                  <div className="col-span-2 text-right font-medium tabular-nums">{formatZAR(q.total)}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
