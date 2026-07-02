import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Trash2, Pencil, Mail } from "lucide-react";
import { formatZAR, formatDate } from "@/lib/format";
import { extractEmailAddress, openEmailDraft } from "@/lib/email-compose";
import { InvoiceStatusBadge } from "./invoices.index";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  component: InvoiceViewPage,
});

function InvoiceViewPage() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isEditRoute = pathname.endsWith(`/invoices/${invoiceId}/edit`);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const [{ data: invoice, error }, { data: items }, { data: profile }] = await Promise.all([
        supabase.from("invoices").select("*, clients(*)").eq("id", invoiceId).maybeSingle(),
        supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("position"),
        supabase.from("business_profiles").select("*").maybeSingle(),
      ]);
      if (error) throw error;
      return { invoice, items: items ?? [], profile };
    },
  });

  const statusMut = useMutation({
    mutationFn: async (status: string) => {
      const patch: any = { status };
      if (status === "sent") patch.sent_at = new Date().toISOString();
      if (status === "paid") patch.paid_at = new Date().toISOString();
      const { error } = await supabase.from("invoices").update(patch).eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice deleted");
      navigate({ to: "/invoices" });
    },
  });

  if (isEditRoute) return <Outlet />;
  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!data?.invoice) return <div className="p-10 text-center">Invoice not found.</div>;
  const { invoice, items, profile } = data;
  const client = invoice.clients as any;
  const nudgeEmail = extractEmailAddress(client?.email);

  const sendNudgeEmail = async () => {
    if (!nudgeEmail) {
      toast.error("This client has no email address on file.");
      return;
    }
    const due = invoice.due_date ? formatDate(invoice.due_date) : "the agreed date";
    const biz = profile?.business_name || "our team";
    const subject = `Invoice ${invoice.invoice_number} - ${formatZAR(invoice.total)}`;
    const body = [
      `Hi ${client?.contact_person || client?.name || "there"},`,
      "",
      `Please find attached invoice ${invoice.invoice_number} (${invoice.title}) for ${formatZAR(invoice.total)}, due on ${due}.`,
      "",
      "Let us know if you have any questions, or please arrange settlement at your earliest convenience.",
      "",
      "Thank you,",
      biz,
    ].join("\n");

    const { generateDocumentPdf } = await import("@/lib/pdf-export");
    const blob = generateDocumentPdf({
      kind: "Invoice",
      number: invoice.invoice_number,
      title: invoice.title,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      subtotal: invoice.subtotal,
      vat_rate: invoice.vat_rate,
      vat_amount: invoice.vat_amount,
      total: invoice.total,
      notes: invoice.notes,
      terms: invoice.terms,
      items: items as any,
      client,
      profile,
    });
    const filename = `Invoice-${invoice.invoice_number}.pdf`;

    const result = await openEmailDraft({
      to: nudgeEmail,
      subject,
      body,
      attachment: { blob, filename },
    });
    if (!result) {
      toast.error("Email draft could not be opened. Please check your default mail app.");
      return;
    }
    if (result === "downloaded") toast.success(`PDF downloaded (${filename}). Drag it into the open email draft to attach.`);
    else toast.success("Email draft opened.");
    if (invoice.status === "draft") statusMut.mutate("sent");
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/invoices"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Select value={invoice.status} onValueChange={(v) => statusMut.mutate(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="default" size="sm" onClick={sendNudgeEmail} disabled={!nudgeEmail}>
            <Mail className="h-4 w-4 mr-1" /> Email / Resend
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/invoices/$invoiceId/edit" params={{ invoiceId }}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
          <Button variant="ghost" size="icon" onClick={() => confirm("Delete this invoice?") && deleteMut.mutate()}>
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
              <div className="text-2xl font-semibold tracking-tight">{invoice.title}</div>
              <div className="text-sm font-mono text-muted-foreground">{invoice.invoice_number}</div>
              <div className="mt-2"><InvoiceStatusBadge status={invoice.status} /></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Billed to</div>
              <div className="font-medium">{invoice.clients?.name ?? "—"}</div>
              {invoice.clients?.contact_person && <div className="text-muted-foreground">{invoice.clients.contact_person}</div>}
              {invoice.clients?.email && <div className="text-muted-foreground">{invoice.clients.email}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Issue date</div>
              <div>{formatDate(invoice.issue_date)}</div>
              {invoice.due_date && (
                <>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2 mb-1">Due by</div>
                  <div>{formatDate(invoice.due_date)}</div>
                </>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</div>
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
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatZAR(invoice.subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>VAT ({Number(invoice.vat_rate)}%)</span><span className="tabular-nums">{formatZAR(invoice.vat_amount)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-border"><span>Total due</span><span className="tabular-nums">{formatZAR(invoice.total)}</span></div>
            </div>
          </div>

          {invoice.terms && (
            <div className="border-t border-border pt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Terms</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.terms}</div>
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
