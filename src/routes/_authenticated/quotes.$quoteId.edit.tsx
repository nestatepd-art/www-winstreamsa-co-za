import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { formatZAR, computeQuoteTotals } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/quotes/$quoteId/edit")({
  component: EditQuotePage,
});

type Item = { description: string; quantity: number; unit_price: number };

function EditQuotePage() {
  const { quoteId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["quote-edit", quoteId],
    queryFn: async () => {
      const [{ data: quote, error }, { data: its }] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle(),
        supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("position"),
      ]);
      if (error) throw error;
      return { quote, items: its ?? [] };
    },
  });

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [vatRate, setVatRate] = useState(15);
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data?.quote && !loaded) {
      const q: any = data.quote;
      setClientId(q.client_id ?? "");
      setTitle(q.title ?? "");
      setQuoteNumber(q.quote_number ?? "");
      setStatus(q.status ?? "draft");
      setIssueDate(q.issue_date ?? "");
      setExpiryDate(q.expiry_date ?? "");
      setVatRate(Number(q.vat_rate ?? 15));
      setNotes(q.notes ?? "");
      setTerms(q.terms ?? "");
      if (data.items.length) {
        setItems(data.items.map((it: any) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })));
      }
      setLoaded(true);
    }
  }, [data, loaded]);

  const totals = useMemo(() => computeQuoteTotals(items, vatRate), [items, vatRate]);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => setItems((arr) => [...arr, { description: "", quantity: 1, unit_price: 0 }]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: updatedQuote, error } = await supabase
        .from("quotes")
        .update({
          client_id: clientId || null,
          title,
          quote_number: quoteNumber,
          status: status as any,
          issue_date: issueDate || new Date().toISOString().slice(0, 10),
          expiry_date: expiryDate || null,
          vat_rate: vatRate,
          notes: notes?.trim() ? notes : null,
          terms: terms?.trim() ? terms : null,
          subtotal: totals.subtotal,
          vat_amount: totals.vat_amount,
          total: totals.total,
        })
        .eq("id", quoteId)
        .select("id")
        .single();
      if (error) throw error;
      if (!updatedQuote) throw new Error("Quote was not updated. Please refresh and try again.");

      const { error: delErr } = await supabase.from("quote_items").delete().eq("quote_id", quoteId);
      if (delErr) throw delErr;

      const cleanItems = items.filter((it) => it.description.trim());
      if (cleanItems.length) {
        const rows = cleanItems.map((it, idx) => ({
          quote_id: quoteId,
          user_id: u.user!.id,
          position: idx,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          line_total: +(it.quantity * it.unit_price).toFixed(2),
        }));
        const { error: e2 } = await supabase.from("quote_items").insert(rows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Quote updated");
      qc.removeQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote-edit", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      navigate({ to: "/quotes/$quoteId", params: { quoteId } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!data?.quote) return <div className="p-10 text-center">Quote not found.</div>;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/quotes/$quoteId" params={{ quoteId }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to quote
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Edit quote</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.quote.quote_number}</p>
        </div>
        <div className="flex gap-2 sm:pt-8">
          <Button variant="outline" asChild>
            <Link to="/quotes/$quoteId" params={{ quoteId }}>Cancel</Link>
          </Button>
          <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Quote number</Label>
            <Input value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft","sent","viewed","accepted","rejected","expired"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>VAT rate (%)</Label>
            <Input type="number" min={0} step="0.01" value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))} />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Issue date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valid until</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
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
                <Textarea placeholder="Description" value={it.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  rows={2} className="resize-none" />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input type="number" min={0} step="0.01" value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Input type="number" min={0} step="0.01" value={it.unit_price}
                  onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} />
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
              <div className="flex justify-between text-muted-foreground"><span>VAT ({vatRate || 0}%)</span><span className="tabular-nums">{formatZAR(totals.vat_amount)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t"><span>Total</span><span className="tabular-nums">{formatZAR(totals.total)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes & terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Intro / notes to client</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Terms</Label>
            <Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/quotes/$quoteId" params={{ quoteId }}>Cancel</Link>
        </Button>
        <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
