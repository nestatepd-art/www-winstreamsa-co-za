import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { formatZAR, formatDate } from "@/lib/format";
import { EmptyState } from "./dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/")({
  component: InvoicesPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  viewed: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "outline",
};

function InvoiceStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="capitalize">{status}</Badge>;
}

function InvoicesPage() {
  const qc = useQueryClient();
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, title, status, total, created_at, due_date, client_id, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice deleted");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const handleDelete = (e: React.MouseEvent, inv: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete invoice ${inv.invoice_number}? This cannot be undone.`)) {
      deleteMut.mutate(inv.id);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Draft a new invoice or convert an accepted quote into one in a click.
          </p>
        </div>
        <Button asChild>
          <Link to="/invoices/new"><Plus className="h-4 w-4 mr-1" /> Create new invoice</Link>
        </Button>
      </header>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Create your first invoice from scratch, or open any accepted quote and click Convert to invoice."
          action={
            <Button asChild>
              <Link to="/invoices/new"><Plus className="h-4 w-4 mr-1" /> Create new invoice</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="col-span-2">Number</div>
                <div className="col-span-3">Title / Client</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Due</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>
              {invoices.map((inv: any) => (
                <Link
                  key={inv.id}
                  to="/invoices/$invoiceId"
                  params={{ invoiceId: inv.id }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/40 transition-colors items-center"
                >
                  <div className="col-span-2 text-sm font-mono text-muted-foreground">{inv.invoice_number}</div>
                  <div className="col-span-3 min-w-0">
                    <div className="font-medium truncate">{inv.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.clients?.name ?? "No client"}</div>
                  </div>
                  <div className="col-span-2"><InvoiceStatusBadge status={inv.status} /></div>
                  <div className="col-span-2 text-sm text-muted-foreground">{formatDate(inv.due_date)}</div>
                  <div className="col-span-2 text-right font-medium tabular-nums">{formatZAR(inv.total)}</div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete invoice"
                      onClick={(e) => handleDelete(e, inv)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { InvoiceStatusBadge };
