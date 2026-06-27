import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Trash2, Receipt, Pencil, Mail } from "lucide-react";
import { formatZAR, formatDate } from "@/lib/format";
import { QuoteStatusBadge } from "./dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quotes/$quoteId")({
  component: QuoteViewPage,
});

function QuoteViewPage() {
  const { quoteId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["quote", quoteId],
    queryFn: async () => {
      const [{ data: quote, error }, { data: items }, { data: profile }] = await Promise.all([
        supabase.from("quotes").select("*, clients(*)").eq("id", quoteId).maybeSingle(),
        supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("position"),
        supabase.from("business_profiles").select("*").maybeSingle(),
      ]);
      if (error) throw error;
      return { quote, items: items ?? [], profile };
    },
  });

  const statusMut = useMutation({
    mutationFn: async (status: string) => {
      const patch: any = { status };
      if (status === "sent") patch.sent_at = new Date().toISOString();
      if (status === "accepted") patch.accepted_at = new Date().toISOString();
      const { error } = await supabase.from("quotes").update(patch).eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quote deleted");
      navigate({ to: "/quotes" });
    },
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!data?.quote) return <div className="p-10 text-center">Quote not found.</div>;

  const { quote, items, profile } = data;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/quotes"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Select value={quote.status} onValueChange={(v) => statusMut.mutate(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <Link to="/quotes/$quoteId/edit" params={{ quoteId }}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const email = quote.clients?.email?.trim();
              if (!email) {
                toast.error("This client has no email on file. Add one in Clients first.");
                return;
              }
              const subject = `${quote.title || "Quotation"} ${quote.quote_number} — ${formatZAR(quote.total)}`;
              const lines = [
                `Hi ${quote.clients?.contact_person || quote.clients?.name || "there"},`,
                "",
                `Please find our quotation ${quote.quote_number} for your review.`,
                ``,
                `Total: ${formatZAR(quote.total)} (incl. VAT)`,
                quote.expiry_date ? `Valid until: ${formatDate(quote.expiry_date)}` : "",
                "",
                quote.notes || "",
                "",
                `Thanks,`,
                profile?.business_name || "",
              ].filter(Boolean).join("\n");
              window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
              import("@/lib/analytics").then(({ track }) =>
                track("quote_sent", { quote_id: quoteId, total: quote.total }),
              );
              if (quote.status === "draft") statusMut.mutate("sent");
            }}
          >
            <Mail className="h-4 w-4 mr-1" /> Send
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/invoices/new" search={{ fromQuote: quoteId }}>
              <Receipt className="h-4 w-4 mr-1" /> Convert to invoice
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
          <Button variant="ghost" size="icon" onClick={() => confirm("Delete this quote?") && deleteMut.mutate()}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="border-b border-border">
          <div className="flex justify-between items-start gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{profile?.business_name || "Your business"}</div>
              {profile?.vat_number && <div className="text-xs text-muted-foreground">VAT {profile.vat_number}</div>}
              {profile?.email && <div className="text-xs text-muted-foreground">{profile.email}</div>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tracking-tight">{quote.title}</div>
              <div className="text-sm font-mono text-muted-foreground">{quote.quote_number}</div>
              <div className="mt-2"><QuoteStatusBadge status={quote.status} /></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Billed to</div>
              <div className="font-medium">{quote.clients?.name ?? "—"}</div>
              {quote.clients?.contact_person && <div className="text-muted-foreground">{quote.clients.contact_person}</div>}
              {quote.clients?.email && <div className="text-muted-foreground">{quote.clients.email}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Issue date</div>
              <div>{formatDate(quote.issue_date)}</div>
              {quote.expiry_date && (
                <>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2 mb-1">Valid until</div>
                  <div>{formatDate(quote.expiry_date)}</div>
                </>
              )}
            </div>
          </div>

          {quote.notes && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</div>
          )}

          <div className="border-t border-border">
            <div className="grid grid-cols-12 gap-3 py-3 text-xs uppercase tracking-wider text-muted-foreground">
              <div className="col-span-7">Description</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-3 py-3 border-t border-border text-sm">
                <div className="col-span-7 whitespace-pre-wrap">{it.description}</div>
                <div className="col-span-1 text-right tabular-nums">{Number(it.quantity)}</div>
                <div className="col-span-2 text-right tabular-nums">{formatZAR(it.unit_price)}</div>
                <div className="col-span-2 text-right tabular-nums">{formatZAR(it.line_total)}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatZAR(quote.subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>VAT ({Number(quote.vat_rate)}%)</span><span className="tabular-nums">{formatZAR(quote.vat_amount)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-border"><span>Total due</span><span className="tabular-nums">{formatZAR(quote.total)}</span></div>
            </div>
          </div>

          {quote.terms && (
            <div className="border-t border-border pt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Terms</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.terms}</div>
            </div>
          )}

          {(profile?.bank_name || profile?.bank_account_number) && (
            <div className="border-t border-border pt-4 text-xs text-muted-foreground">
              <div className="uppercase tracking-wider mb-1">Banking details</div>
              {profile?.bank_account_holder && <div>{profile.bank_account_holder}</div>}
              {profile?.bank_name && <div>{profile.bank_name}</div>}
              {profile?.bank_account_number && <div>Acc: {profile.bank_account_number}</div>}
              {profile?.bank_branch_code && <div>Branch: {profile.bank_branch_code}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
