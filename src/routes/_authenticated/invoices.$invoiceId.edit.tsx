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
      setInvoiceNumber(data.invoice.invoice_number ?? "");
      setStatus(data.invoice.status ?? "draft");
      setIssueDate(data.invoice.issue_date ?? "");
      setVatRate(Number(data.invoice.vat_rate ?? 15));
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

  const totals = useMemo(() => computeQuoteTotals(items, vatRate), [items, vatRate]);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => setItems((arr) => [...arr, { description: "", quantity: 1, unit_price: 0 }]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      // 1) Save company / business profile by user_id. The table has a unique
      //    user_id constraint, so this works whether the profile already exists
      //    or has not been created yet.
      const NOT_NULL_DEFAULTS: Record<string, string> = {
        business_name: "",
        country: "South Africa",
      };
      const profilePayload: Record<string, any> = { user_id: u.user.id };
      COMPANY_FIELDS.forEach((f) => {
        const v = (company[f.key] ?? "").trim();
        if (f.key in NOT_NULL_DEFAULTS) {
          profilePayload[f.key] = v || NOT_NULL_DEFAULTS[f.key];
        } else {
          profilePayload[f.key] = v ? v : null;
        }
      });
      const { error: pErr } = await supabase
        .from("business_profiles")
        .upsert(profilePayload as any, { onConflict: "user_id" });
      if (pErr) throw pErr;

      // 2) Update the invoice header.
      const { data: updatedInvoice, error } = await supabase
        .from("invoices")
        .update({
          client_id: clientId || null,
          title,
          invoice_number: invoiceNumber,
          status: status as any,
          issue_date: issueDate || new Date().toISOString().slice(0, 10),
          notes: notes?.trim() ? notes : null,
          terms: terms?.trim() ? terms : null,
          due_date: dueDate || null,
          vat_rate: vatRate,
          subtotal: totals.subtotal,
          vat_amount: totals.vat_amount,
          total: totals.total,
        })
        .eq("id", invoiceId)
        .select("id")
        .single();
      if (error) throw error;
      if (!updatedInvoice) throw new Error("Invoice was not updated. Please refresh and try again.");

      // 3) Replace line items.
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
    },
    onSuccess: () => {
      toast.success("Invoice updated");
      qc.removeQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoice-edit", invoiceId] });
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/invoices/$invoiceId" params={{ invoiceId }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to invoice
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Edit invoice</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.invoice.invoice_number}</p>
        </div>
        <div className="flex gap-2 sm:pt-8">
          <Button variant="outline" asChild>
            <Link to="/invoices/$invoiceId" params={{ invoiceId }}>Cancel</Link>
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
            <Label htmlFor="invoice-number">Invoice number</Label>
            <Input id="invoice-number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft","sent","viewed","paid","overdue","cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-vat-rate">VAT rate (%)</Label>
            <Input id="invoice-vat-rate" type="number" min={0} step="0.01" value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))} />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="invoice-title">Title</Label>
            <Input id="invoice-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-issue-date">Issue date</Label>
            <Input id="invoice-issue-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-due-date">Due date</Label>
            <Input id="invoice-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
              <div className="flex justify-between text-muted-foreground"><span>VAT ({vatRate || 0}%)</span><span className="tabular-nums">{formatZAR(totals.vat_amount)}</span></div>
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
              <Label htmlFor={`company-${f.key}`}>{f.label}</Label>
              <Input
                id={`company-${f.key}`}
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
            <Label htmlFor="invoice-notes">Notes (shown on the invoice)</Label>
            <Textarea id="invoice-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-terms">Terms</Label>
            <Textarea id="invoice-terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
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
