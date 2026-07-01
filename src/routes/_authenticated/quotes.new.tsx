import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { draftQuoteItem, draftQuoteNotes } from "@/lib/ai.functions";
import { useConsumeQuota } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Trash2, Plus, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatZAR, computeQuoteTotals, generateQuoteNumber } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { AiDraftedBanner } from "@/components/AiDraftedBanner";

export const Route = createFileRoute("/_authenticated/quotes/new")({
  component: NewQuotePage,
});

type Item = { description: string; quantity: number; unit_price: number; _drafting?: boolean };

function NewQuotePage() {
  const navigate = useNavigate();
  const draftItem = useServerFn(draftQuoteItem);
  const draftNotes = useServerFn(draftQuoteNotes);
  const consume = useConsumeQuota();

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
      const { data } = await supabase.from("business_profiles").select("business_name, brand_tone, default_quote_validity_days, default_quote_terms").maybeSingle();
      return data;
    },
  });

  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("Quotation");
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [scopeBrief, setScopeBrief] = useState("");
  const [draftingNotes, setDraftingNotes] = useState(false);

  const totals = useMemo(() => computeQuoteTotals(items, 15), [items]);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => setItems((arr) => [...arr, { description: "", quantity: 1, unit_price: 0 }]);

  const draftLineMut = async (i: number, brief: string) => {
    if (!brief.trim()) return toast.error("Type a short brief first (e.g. 'install 3 plug points')");
    if (!(await consume("ai_draft"))) return;
    updateItem(i, { _drafting: true });
    try {
      const res = await draftItem({ data: { brief, tone: profile?.brand_tone ?? undefined } });
      updateItem(i, { description: res.description, _drafting: false });
    } catch (e: any) {
      updateItem(i, { _drafting: false });
      toast.error(e.message ?? "AI draft failed");
    }
  };

  const draftAllNotes = async () => {
    if (!scopeBrief.trim()) return toast.error("Describe the job in 1-2 sentences first");
    if (!(await consume("ai_draft"))) return;
    setDraftingNotes(true);
    try {
      const client = clients.find((c) => c.id === clientId);
      const res = await draftNotes({
        data: {
          businessName: profile?.business_name,
          clientName: client?.name,
          scope: scopeBrief,
          tone: profile?.brand_tone ?? undefined,
        },
      });
      setNotes(res.intro);
      setTerms(res.terms);
      toast.success("Notes drafted");
    } catch (e: any) {
      toast.error(e.message ?? "AI draft failed");
    } finally {
      setDraftingNotes(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: async (status: "draft" | "sent") => {
      const allowed = await consume("quote");
      if (!allowed) throw new Error("Quote limit reached. Buy credits or upgrade.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const quoteNumber = generateQuoteNumber();
      const validity = profile?.default_quote_validity_days ?? 30;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + validity);
      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          user_id: u.user.id,
          client_id: clientId || null,
          quote_number: quoteNumber,
          title,
          status,
          notes,
          terms: terms || profile?.default_quote_terms || null,
          expiry_date: expiry.toISOString().slice(0, 10),
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
          quote_id: quote.id,
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
      return quote;
    },
    onSuccess: (q) => {
      toast.success("Quote saved");
      navigate({ to: "/quotes/$quoteId", params: { quoteId: q.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/quotes"><ArrowLeft className="h-4 w-4 mr-1" /> Back to quotes</Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">New quote</h1>
        <p className="text-muted-foreground text-sm mt-1">Build your quote. WinStream can draft descriptions and notes for you.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
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
              <div className="col-span-12 sm:col-span-6 space-y-1">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Description (or type a short brief and hit ✨)"
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Draft with AI"
                    onClick={() => draftLineMut(i, it.description)}
                    disabled={it._drafting}
                  >
                    {it._drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Input type="number" min={0} step="0.01" value={it.quantity} onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} placeholder="Qty" />
              </div>
              <div className="col-span-5 sm:col-span-2 space-y-1">
                <Input type="number" min={0} step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })} placeholder="Unit (R)" />
              </div>
              <div className="col-span-2 sm:col-span-1 text-right text-sm font-medium tabular-nums pt-2">
                {formatZAR(it.quantity * it.unit_price)}
              </div>
              <div className="col-span-1 pt-1">
                <Button variant="ghost" size="icon" onClick={() => removeItem(i)} aria-label="Remove line">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t border-border pt-4 mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span className="tabular-nums">{formatZAR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (15%)</span><span className="tabular-nums">{formatZAR(totals.vat_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Total</span><span className="tabular-nums">{formatZAR(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notes & terms</CardTitle>
          <Button variant="outline" size="sm" onClick={draftAllNotes} disabled={draftingNotes}>
            {draftingNotes ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Draft with AI
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Job brief (for AI)</Label>
            <Input
              placeholder="e.g. fit a new geyser and 2 isolation valves"
              value={scopeBrief}
              onChange={(e) => setScopeBrief(e.target.value)}
            />
          </div>
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

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background/80 backdrop-blur py-4 -mx-6 px-6 border-t border-border">
        <Button variant="outline" onClick={() => saveMut.mutate("draft")} disabled={saveMut.isPending}>
          Save as draft
        </Button>
        <Button onClick={() => saveMut.mutate("sent")} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & mark sent"}
        </Button>
      </div>
    </div>
  );
}
