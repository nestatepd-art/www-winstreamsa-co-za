import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatZAR, computeQuoteTotals, generateInvoiceNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  component: NewInvoicePage,
  validateSearch: (s: Record<string, unknown>) => ({
    fromQuote: typeof s.fromQuote === "string" ? s.fromQuote : undefined,
  }),
});

type Item = { description: string; quantity: number; unit_price: number };

function NewInvoicePage() {
  const navigate = useNavigate();
  const { fromQuote } = useSearch({ from: "/_authenticated/invoices/new" });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });
  const { data: profile } = useQuery({
    queryKey: ["business-min"],
    queryFn: async () => {
      const { data } = await supabase.from("business_profiles").select("business_name, default_quote_terms").maybeSingle();
      return data;
    },
  });

  const { data: sourceQuote } = useQuery({
    queryKey: ["quote-source", fromQuote],
    enabled: !!fromQuote,
    queryFn: async () => {
      const [{ data: q }, { data: its }] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", fromQuote!).maybeSingle(),
        supabase.from("quote_items").select("*").eq("quote_id", fromQuote!).order("position"),
      ]);
      return { quote: q, items: its ?? [] };
    },
  });

  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("Invoice");
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [dueDays, setDueDays] = useState<number>(14);

  useEffect(() => {
    if (sourceQuote?.quote) {
      const q = sourceQuote.quote;
      setClientId(q.client_id ?? "");
      setTitle(`Invoice for ${q.title}`);
      setNotes(q.notes ?? "");
      setTerms(q.terms ?? "");
      if (sourceQuote.items.length) {
        setItems(
          sourceQuote.items.map((it: any) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
          })),
        );
      }
    }
  }, [sourceQuote]);

  const totals = useMemo(() => computeQuoteTotals(items, 15), [items]);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => setItems((arr) => [...arr, { description: "", quantity: 1, unit_price: 0 }]);

  const saveMut = useMutation({
    mutationFn: async (status: "draft" | "sent") => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const invoiceNumber = generateInvoiceNumber();
      const due = new Date();
      due.setDate(due.getDate() + (dueDays || 14));
      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          user_id: u.user.id,
          client_id: clientId || null,
          quote_id: fromQuote ?? null,
          invoice_number: invoiceNumber,
          title,
          status,
          notes,
          terms: terms || profile?.default_quote_terms || null,
          due_date: due.toISOString().slice(0, 10),
          subtotal: totals.subtotal,
          vat_amount: totals.vat_amount,
          total: totals.total,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;

      const cleanItems = items.filter((it) => it.description.trim());
      if (cleanItems.length) {
        const rows = cleanItems.map((it, idx) => ({
          invoice_id: invoice.id,
          user_id: u.user!.id,
          position: idx,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          line_total: +(it.quantity * it.unit_price).toFixed(2),
        }));
        const { error: e2 } = await supabase.from("invoice_items").insert(rows);
        if (e2) throw e2;
      }
      return invoice;
    },
    onSuccess: (inv) => {
      toast.success("Invoice saved");
      navigate({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/invoices"><ArrowLeft className="h-4 w-4 mr-1" /> Back to invoices</Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">
          {fromQuote ? "Convert quote to invoice" : "New invoice"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {fromQuote
            ? "Line items copied from the quote — review and send."
            : "Build your invoice. VAT is calculated at 15%."}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment due (days)</Label>
            <Input type="number" min={0} value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))} />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add line</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 sm:col-span-6">
                <Textarea
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input
                  type="number" min={0} step="0.01"
                  value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Input
                  type="number" min={0} step="0.01"
                  value={it.unit_price}
                  onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2 sm:col-span-1 text-right tabular-nums text-sm pt-2">
                {formatZAR(it.quantity * it.unit_price)}
              </div>
              <div className="col-span-1 text-right">
                <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-4 border-t">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatZAR(totals.subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>VAT (15%)</span><span className="tabular-nums">{formatZAR(totals.vat_amount)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t"><span>Total due</span><span className="tabular-nums">{formatZAR(totals.total)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes & terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notes (shown on the invoice)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Terms</Label>
            <Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saveMut.isPending} onClick={() => saveMut.mutate("draft")}>
          Save as draft
        </Button>
        <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate("sent")}>
          Save & mark sent
        </Button>
      </div>
    </div>
  );
}
