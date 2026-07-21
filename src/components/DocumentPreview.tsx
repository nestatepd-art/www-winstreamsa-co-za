import { formatDate, formatZAR } from "@/lib/format";

type LineItem = {
  id?: string;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  line_total?: number | string | null;
};

type Client = {
  name?: string | null;
  contact_person?: string | null;
  email?: string | null;
};

type Profile = {
  business_name?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_branch_code?: string | null;
};

type DocumentPreviewProps = {
  kind: "Invoice" | "Quote";
  number: string;
  title?: string | null;
  status?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  expiryDate?: string | null;
  subtotal: number | string;
  vatRate: number | string;
  vatAmount: number | string;
  total: number | string;
  notes?: string | null;
  terms?: string | null;
  items: LineItem[];
  client?: Client | null;
  profile?: Profile | null;
  logoUrl?: string | null;
};

function safeQuantity(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DocumentPreview({
  kind,
  number,
  title,
  status,
  issueDate,
  dueDate,
  expiryDate,
  subtotal,
  vatRate,
  vatAmount,
  total,
  notes,
  terms,
  items,
  client,
  profile,
  logoUrl,
}: DocumentPreviewProps) {
  const dateLabel = kind === "Invoice" ? "Due date" : "Valid until";
  const dateValue = kind === "Invoice" ? dueDate : expiryDate;
  const bankLines = [
    profile?.bank_account_holder,
    profile?.bank_name,
    profile?.bank_account_number ? `Acc: ${profile.bank_account_number}` : null,
    profile?.bank_branch_code ? `Branch: ${profile.bank_branch_code}` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="max-h-[760px] overflow-auto rounded-md border border-border bg-muted/30 p-3 sm:p-6">
      <article className="mx-auto min-h-[720px] w-full max-w-[794px] rounded-sm border border-document-border bg-document-page p-6 text-document-ink shadow-elevated sm:p-10">
        <div className="flex items-start justify-between gap-8 border-b border-document-border pb-5">
          <div className="min-w-0 flex items-start gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${profile?.business_name ?? "Business"} logo`}
                className="h-14 w-14 shrink-0 rounded-sm object-contain bg-white border border-document-border"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-14 w-14 shrink-0 rounded-sm border border-document-border bg-muted/40 flex items-center justify-center text-base font-semibold text-document-muted"
              >
                {getBusinessInitials(profile?.business_name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-base font-semibold text-document-ink">
                {profile?.business_name || "Your business"}
              </div>
              <div className="mt-2 space-y-1 text-xs text-document-muted">
                {profile?.vat_number && <div>VAT: {profile.vat_number}</div>}
                {profile?.email && <div className="break-all">{profile.email}</div>}
                {profile?.phone && <div>{profile.phone}</div>}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-2xl font-semibold text-document-ink">{kind}</div>
            <div className="mt-1 font-mono text-xs text-document-muted">{number}</div>
            {status && <div className="mt-2 text-xs font-medium uppercase text-document-muted">{status}</div>}
          </div>
        </div>

        <div className="mt-7 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase text-document-muted">Billed to</div>
            <div className="mt-2 font-medium text-document-ink">{client?.name || "—"}</div>
            {client?.contact_person && <div className="mt-1 text-document-muted">{client.contact_person}</div>}
            {client?.email && <div className="mt-1 break-all text-document-muted">{client.email}</div>}
          </div>

          <div className="sm:text-right">
            <div className="text-xs font-medium uppercase text-document-muted">Issue date</div>
            <div className="mt-2 text-document-ink">{issueDate ? formatDate(issueDate) : "—"}</div>
            {dateValue && (
              <>
                <div className="mt-4 text-xs font-medium uppercase text-document-muted">{dateLabel}</div>
                <div className="mt-2 text-document-ink">{formatDate(dateValue)}</div>
              </>
            )}
          </div>
        </div>

        {title && <div className="mt-7 text-lg font-semibold text-document-ink">{title}</div>}
        {notes && <div className="mt-3 whitespace-pre-wrap text-sm text-document-muted">{notes}</div>}

        <div className="mt-8 overflow-hidden rounded-sm border border-document-border">
          <div className="grid grid-cols-12 gap-3 bg-document-muted px-3 py-2 text-xs font-medium uppercase text-document-muted">
            <div className="col-span-6 sm:col-span-7">Description</div>
            <div className="col-span-2 text-right sm:col-span-1">Qty</div>
            <div className="col-span-2 text-right">Unit</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          {items.length > 0 ? (
            items.map((item, index) => (
              <div
                key={item.id ?? index}
                className="grid grid-cols-12 gap-3 border-t border-document-border px-3 py-3 text-sm text-document-ink"
              >
                <div className="col-span-6 whitespace-pre-wrap break-words sm:col-span-7">
                  {item.description || "—"}
                </div>
                <div className="col-span-2 text-right tabular-nums sm:col-span-1">{safeQuantity(item.quantity)}</div>
                <div className="col-span-2 text-right tabular-nums">{formatZAR(item.unit_price ?? 0)}</div>
                <div className="col-span-2 text-right tabular-nums">{formatZAR(item.line_total ?? 0)}</div>
              </div>
            ))
          ) : (
            <div className="border-t border-document-border px-3 py-6 text-center text-sm text-document-muted">No line items</div>
          )}
        </div>

        <div className="mt-7 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-4 text-document-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatZAR(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 text-document-muted">
              <span>VAT ({Number(vatRate)}%)</span>
              <span className="tabular-nums">{formatZAR(vatAmount)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-document-border pt-3 text-base font-semibold text-document-ink">
              <span>Total due</span>
              <span className="tabular-nums">{formatZAR(total)}</span>
            </div>
          </div>
        </div>

        {terms && (
          <section className="mt-8 border-t border-document-border pt-5">
            <div className="text-xs font-medium uppercase text-document-muted">Terms</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-document-muted">{terms}</div>
          </section>
        )}

        {bankLines.length > 0 && (
          <section className="mt-6 border-t border-document-border pt-5 text-xs text-document-muted">
            <div className="font-medium uppercase">Banking details</div>
            <div className="mt-2 space-y-1">
              {bankLines.map((line) => <div key={line}>{line}</div>)}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}