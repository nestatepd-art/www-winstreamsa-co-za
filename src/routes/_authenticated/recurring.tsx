import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listRecurring,
  saveRecurring,
  setRecurringActive,
  deleteRecurring,
  runRecurringNow,
} from "@/lib/recurring.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Repeat, Send, Download } from "lucide-react";
import { toast } from "sonner";
import { formatZAR, computeQuoteTotals } from "@/lib/format";
import { DocumentPreview } from "@/components/DocumentPreview";
import { generateDocumentPdf, downloadBlob } from "@/lib/pdf-export";
import { useLogoAsset } from "@/hooks/use-logo-asset";
import { useCreditStatus } from "@/hooks/use-credits";
import { DEFAULT_RECURRING_BODY, DEFAULT_RECURRING_SUBJECT } from "@/lib/recurring-defaults";

export const Route = createFileRoute("/_authenticated/recurring")({
  head: () => ({
    meta: [
      { title: "Recurring invoices — WinStream SA" },
      {
        name: "description",
        content:
          "Set up a monthly invoice once and WinStream issues and emails it to your client automatically on the day you choose.",
      },
      { property: "og:title", content: "Recurring invoices — WinStream SA" },
      {
        property: "og:description",
        content: "Automatic monthly invoicing and payment reminders for South African small businesses.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecurringPage,
});

type Item = { description: string; quantity: number; unit_price: number };

const emptyForm = () => ({
  id: undefined as string | undefined,
  client_id: "",
  title: "Monthly retainer",
  day_of_month: 1,
  items: [{ description: "", quantity: 1, unit_price: 0 }] as Item[],
  vat_rate: 15,
  due_days: 14,
  notes: "",
  terms: "",
  email_subject: "",
  email_body: "",
  auto_send: true,
  active: true,
});

function RecurringPage() {
  const qc = useQueryClient();
  const list = useServerFn(listRecurring);
  const save = useServerFn(saveRecurring);
  const toggle = useServerFn(setRecurringActive);
  const remove = useServerFn(deleteRecurring);
  const runNow = useServerFn(runRecurringNow);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["recurring"],
    queryFn: () => list(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, email").order("name");
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const totals = computeQuoteTotals(form.items, form.vat_rate);

  const refresh = () => qc.invalidateQueries({ queryKey: ["recurring"] });

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: form.id,
          client_id: form.client_id || null,
          title: form.title,
          day_of_month: Number(form.day_of_month) || 1,
          items: form.items.filter((i) => i.description.trim()),
          vat_rate: Number(form.vat_rate) || 0,
          due_days: Number(form.due_days) || 14,
          notes: form.notes || null,
          terms: form.terms || null,
          email_subject: form.email_subject || null,
          email_body: form.email_body || null,
          auto_send: form.auto_send,
          active: form.active,
        },
      }),
    onSuccess: () => {
      toast.success("Recurring invoice saved");
      setOpen(false);
      setForm(emptyForm());
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const runMut = useMutation({
    mutationFn: (id: string) => runNow({ data: { id } }),
    onSuccess: (res: any) => {
      if (res.emailed) toast.success("Invoice created and emailed to the client");
      else toast.warning(`Invoice created — email not sent (${res.emailError ?? "auto-send off"})`);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editSchedule = (s: any) => {
    setForm({
      id: s.id,
      client_id: s.client_id ?? "",
      title: s.title,
      day_of_month: s.day_of_month,
      items: Array.isArray(s.items) && s.items.length ? s.items : [{ description: "", quantity: 1, unit_price: 0 }],
      vat_rate: Number(s.vat_rate),
      due_days: s.due_days,
      notes: s.notes ?? "",
      terms: s.terms ?? "",
      email_subject: s.email_subject ?? "",
      email_body: s.email_body ?? "",
      auto_send: s.auto_send,
      active: s.active,
    });
    setOpen(true);
  };

  const setItem = (i: number, patch: Partial<Item>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Recurring invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set it up once — WinStream issues the invoice and emails your client on the same day every month.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm()); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New schedule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit schedule" : "New recurring invoice"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Send on day of month (1–28)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={form.day_of_month}
                    onChange={(e) => setForm((f) => ({ ...f, day_of_month: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment due (days after issue)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.due_days}
                    onChange={(e) => setForm((f) => ({ ...f, due_days: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Line items</Label>
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-6">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input value={it.description} placeholder="Monthly service fee"
                        onChange={(e) => setItem(i, { description: e.target.value })} />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input type="number" value={it.quantity}
                        onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Label className="text-xs text-muted-foreground">Unit price (R)</Label>
                      <Input type="number" value={it.unit_price}
                        onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon"
                        onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, unit_price: 0 }] }))}>
                  <Plus className="h-3 w-3 mr-1" /> Add line
                </Button>
                <div className="text-sm text-right text-muted-foreground">
                  Subtotal {formatZAR(totals.subtotal)} · VAT {formatZAR(totals.vat_amount)} ·{" "}
                  <span className="font-semibold text-foreground">Total {formatZAR(totals.total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email subject (optional — {"{invoice_number}"} is replaced)</Label>
                <Input value={form.email_subject} placeholder="Invoice {invoice_number} — monthly service"
                  onChange={(e) => setForm((f) => ({ ...f, email_subject: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email message (optional)</Label>
                <Textarea rows={4} value={form.email_body}
                  placeholder="Leave blank to use the standard payment reminder wording."
                  onChange={(e) => setForm((f) => ({ ...f, email_body: e.target.value }))} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Email the invoice automatically</p>
                  <p className="text-xs text-muted-foreground">Off = the invoice is created as a draft only.</p>
                </div>
                <Switch checked={form.auto_send} onCheckedChange={(v) => setForm((f) => ({ ...f, auto_send: v }))} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={saveMut.isPending || !form.client_id} onClick={() => saveMut.mutate()}>
                  {form.id ? "Save changes" : "Create schedule"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Repeat className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No recurring invoices yet. Create one and it will fire every month on your chosen date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(schedules as any[]).map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.clients?.name ?? "No client"} · day {s.day_of_month} of every month · next{" "}
                    {new Date(s.next_run_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Active" : "Paused"}</Badge>
                  <Switch
                    checked={s.active}
                    onCheckedChange={async (v) => {
                      await toggle({ data: { id: s.id, active: v } });
                      refresh();
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {(s.items ?? []).length} line item(s) · auto-email {s.auto_send ? "on" : "off"}
                  {s.run_count ? ` · sent ${s.run_count} time(s)` : ""}
                  {s.last_run_at ? ` · last run ${new Date(s.last_run_at).toLocaleString("en-ZA")}` : ""}
                </div>
                {s.last_error && <p className="text-sm text-destructive">Last issue: {s.last_error}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => editSchedule(s)}>Edit</Button>
                  <Button size="sm" disabled={runMut.isPending} onClick={() => runMut.mutate(s.id)}>
                    <Send className="h-3 w-3 mr-1" /> Run now (test)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Delete this recurring invoice?")) return;
                      await remove({ data: { id: s.id } });
                      toast.success("Schedule deleted");
                      refresh();
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
