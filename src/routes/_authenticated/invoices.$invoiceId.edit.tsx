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

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId/edit")({
  component: EditInvoicePage,
});

type Item = { description: string; quantity: number; unit_price: number };

function EditInvoicePage() {
  const { invoiceId } = Route.useParams();
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
    queryKey: ["invoice-edit", invoiceId],
    queryFn: async () => {
      const [{ data: invoice, error }, { data: its }, { data: u }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
        supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("position"),
        supabase.auth.getUser(),
      ]);
      if (error) throw error;
      const { data: profile } = u.user
        ? await supabase.from("business_profiles").select("*").eq("user_id", u.user.id).maybeSingle()
        : ({ data: null } as any);
      return { invoice, items: its ?? [], profile };
    },
  });

  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [issueDate, setIssueDate] = useState<string>("");
  const [vatRate, setVatRate] = useState<number>(15);
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [company, setCompany] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const COMPANY_FIELDS: { key: string; label: string }[] = [
    { key: "business_name", label: "Business name" },
    { key: "trading_name", label: "Trading name" },
    { key: "vat_number", label: "VAT number" },
    { key: "registration_number", label: "Registration number" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "website", label: "Website" },
    { key: "address_line1", label: "Address line 1" },
    { key: "address_line2", label: "Address line 2" },
    { key: "city", label: "City" },
    { key: "province", label: "Province" },
    { key: "postal_code", label: "Postal code" },
    { key: "country", label: "Country" },
    { key: "bank_name", label: "Bank name" },
    { key: "bank_account_holder", label: "Account holder" },
    { key: "bank_account_number", label: "Account number" },
    { key: "bank_branch_code", label: "Branch code" },
  ];

  useEffect(() => {
    if (data?.invoice && !loaded) {
      setClientId(data.invoice.client_id ?? "");
      setTitle(data.invoice.title ?? "");
      setNotes(data.invoice.notes ?? "");
      setTerms(data.invoice.terms ?? "");
      setDueDate(data.invoice.due_date ?? "");
      if (data.items.length) {
        setItems(
          data.items.map((it: any) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
          })),
        );
      }
      const p: any = data.profile ?? {};
      const next: Record<string, string> = {};
      COMPANY_FIELDS.forEach((f) => { next[f.key] = p[f.key] ?? ""; });
      setCompany(next);
      setLoaded(true);
    }
  }, [data, loaded]);

  const totals = useMemo(() => computeQuoteTotals(items, 15), [items]);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => setItems((arr) => [...arr, { description: "", quantity: 1, unit_price: 0 }]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("invoices")
        .update({
          client_id: clientId || null,
          title,
          notes,
          terms: terms || null,
          due_date: dueDate || null,
          subtotal: totals.subtotal,
          vat_amount: totals.vat_amount,
          total: totals.total,
        })
        .eq("id", invoiceId);
      if (error) throw error;

      // Replace line items
      const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      if (delErr) throw delErr;

      const cleanItems = items.filter((it) => it.description.trim());
      if (cleanItems.length) {
        const rows = cleanItems.map((it, idx) => ({
          invoice_id: invoiceId,
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

      // Upsert company / business profile
      const profilePayload: Record<string, any> = { user_id: u.user.id };
      COMPANY_FIELDS.forEach((f) => {
        profilePayload[f.key] = company[f.key]?.trim() ? company[f.key] : null;
      });
      const { error: pErr } = await supabase
        .from("business_profiles")
        .upsert(profilePayload, { onConflict: "user_id" });
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("Invoice updated");
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["business-profile"] });
      navigate({ to: "/invoices/$invoiceId", params: { invoiceId } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!data?.invoice) return <div className="p-10 text-center">Invoice not found.</div>;


  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/invoices/$invoiceId" params={{ invoiceId }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to invoice
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Edit invoice</h1>
        <p className="text-muted-foreground text-sm mt-1">{data.invoice.invoice_number}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
              <div className="flex justify-between text-muted-foreground"><span>VAT (15%)</span><span className="tabular-nums">{formatZAR(totals.vat_amount)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t"><span>Total due</span><span className="tabular-nums">{formatZAR(totals.total)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company details</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Shown on this and future invoices. Saved to your business profile.</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {COMPANY_FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label>{f.label}</Label>
              <Input
                value={company[f.key] ?? ""}
                onChange={(e) => setCompany((c) => ({ ...c, [f.key]: e.target.value }))}
              />
            </div>
          ))}
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
        <Button variant="outline" asChild>
          <Link to="/invoices/$invoiceId" params={{ invoiceId }}>Cancel</Link>
        </Button>
        <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
