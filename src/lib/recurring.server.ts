import { sendViaResend, brandedEmailHtml } from "./resend-send.server";
import { formatZAR, formatDate } from "./format";
import { generateDocumentPdf } from "./pdf-export";
import {
  DEFAULT_RECURRING_BODY,
  DEFAULT_RECURRING_SUBJECT,
  fillRecurringTemplate,
} from "./recurring-defaults";

/** Tolerant numeric parse — accepts "1 500", "1,500.50", "R1500". */
export const num = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Downloads the business logo from storage and returns a data URL for the PDF header. */
async function loadLogoDataUrl(supabase: any, logoRef?: string | null): Promise<string | null> {
  if (!logoRef) return null;
  if (logoRef.startsWith("data:")) return logoRef;
  try {
    let bytes: Uint8Array;
    let mime = "image/png";
    if (/^https?:/i.test(logoRef)) {
      const res = await fetch(logoRef);
      if (!res.ok) return null;
      mime = res.headers.get("content-type") || mime;
      bytes = new Uint8Array(await res.arrayBuffer());
    } else {
      const { data, error } = await supabase.storage.from("business-logos").download(logoRef);
      if (error || !data) return null;
      mime = (data as Blob).type || (logoRef.endsWith(".jpg") || logoRef.endsWith(".jpeg") ? "image/jpeg" : "image/png");
      bytes = new Uint8Array(await (data as Blob).arrayBuffer());
    }
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
    }
    return `data:${mime};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

/** Renders the invoice PDF server-side so the automated email always carries the document. */
async function buildInvoicePdfBase64(input: {
  number: string;
  title: string;
  issueDate: string;
  dueDate: string;
  items: RecurringItem[];
  totals: { subtotal: number; vat_amount: number; total: number };
  vatRate: number;
  notes?: string | null;
  terms?: string | null;
  client: any;
  profile: any;
  logoDataUrl?: string | null;
}): Promise<string | null> {

  try {
    const blob = generateDocumentPdf({
      kind: "Invoice",
      number: input.number,
      // Internal schedule title stays off the client-facing document.
      title: "",
      status: "sent",
      issue_date: input.issueDate,

      due_date: input.dueDate,
      subtotal: input.totals.subtotal,
      vat_rate: input.vatRate,
      vat_amount: input.totals.vat_amount,
      total: input.totals.total,
      notes: input.notes ?? null,
      terms: input.terms ?? null,
      items: input.items.map((it) => ({
        description: it.description,
        quantity: num(it.quantity),
        unit_price: num(it.unit_price),
        line_total: +(num(it.quantity) * num(it.unit_price)).toFixed(2),
      })),
      client: input.client ?? null,
      profile: input.profile ?? null,
      logoDataUrl: input.logoDataUrl ?? null,
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(bin);
  } catch {
    return null;
  }
}

export type RecurringItem = { description: string; quantity: number; unit_price: number };

export function computeTotals(items: RecurringItem[], vatRate: number) {
  const subtotal = +items
    .reduce((s, it) => s + num(it.quantity) * num(it.unit_price), 0)
    .toFixed(2);
  const vat_amount = +((subtotal * num(vatRate)) / 100).toFixed(2);
  const total = +(subtotal + vat_amount).toFixed(2);
  return { subtotal, vat_amount, total };
}


export function invoiceNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${y}${m}-${rnd}`;
}

/** Next occurrence of `day` after `from` (clamped to the month's last day). */
export function nextRunDate(day: number, from: Date): string {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + 1; // next month
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): string {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Generates one invoice (+ items) from a schedule row and optionally emails the client.
 * Bounded, idempotent per-run: the caller advances next_run_date in the same step.
 */
export async function runSchedule(
  supabase: any,
  schedule: any,
): Promise<{ invoiceId: string; emailed: boolean; emailError?: string }> {
  const items: RecurringItem[] = Array.isArray(schedule.items) ? schedule.items : [];
  const clean = items
    .filter((it) => (it.description ?? "").trim())
    .map((it) => ({
      description: String(it.description).trim(),
      quantity: num(it.quantity),
      unit_price: num(it.unit_price),
    }));
  if (!clean.length) {
    throw new Error("This schedule has no line items — add at least one description with a price.");
  }
  const totals = computeTotals(clean, schedule.vat_rate ?? 15);

  const today = new Date();
  const issueDate = today.toISOString().slice(0, 10);
  const number = invoiceNumber();
  const dueDate = addDays(today, schedule.due_days ?? 14);

  const { data: profileEarly } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", schedule.user_id)
    .maybeSingle();
  const bizName = profileEarly?.business_name || "our team";
  const templateVars = {
    invoice_number: number,
    total: formatZAR(totals.total),
    due_date: formatDate(dueDate),
    business_name: bizName,
  };
  // The reminder message the user edits lives on email_body; notes is the legacy/optional override.
  const messageTemplate =
    (schedule.email_body ?? "").trim() || (schedule.notes ?? "").trim() || DEFAULT_RECURRING_BODY;
  const filledMessage = fillRecurringTemplate(messageTemplate, templateVars);


  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      user_id: schedule.user_id,
      client_id: schedule.client_id,
      invoice_number: number,
      title: schedule.title || "Monthly invoice",
      status: schedule.auto_send ? "sent" : "draft",
      issue_date: issueDate,
      due_date: addDays(today, schedule.due_days ?? 14),
      notes: schedule.notes ?? schedule.email_body ?? null,
      terms: schedule.terms,
      vat_rate: schedule.vat_rate ?? 15,
      subtotal: totals.subtotal,
      vat_amount: totals.vat_amount,
      total: totals.total,
      sent_at: schedule.auto_send ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (clean.length) {
    const rows = clean.map((it, idx) => ({
      invoice_id: invoice.id,
      user_id: schedule.user_id,
      position: idx,
      description: it.description,
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      line_total: +((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)).toFixed(2),
    }));
    await supabase.from("invoice_items").insert(rows);
  }

  if (!schedule.auto_send) return { invoiceId: invoice.id, emailed: false };

  const { data: client } = await supabase
    .from("clients")
    .select("name, contact_person, email")
    .eq("id", schedule.client_id)
    .maybeSingle();
  const toEmail: string | undefined = client?.email;

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", schedule.user_id)
    .maybeSingle();
  const businessName = profile?.business_name || "our team";

  if (!toEmail) {
    await supabase.from("nudge_log").insert({
      user_id: schedule.user_id,
      record_type: "invoice",
      record_id: invoice.id,
      sent_to: "-",
      subject: schedule.email_subject || `Invoice ${number}`,
      status: "skipped",
      error: "no client email",
    });
    return { invoiceId: invoice.id, emailed: false, emailError: "no client email" };
  }

  const dueDate = addDays(today, schedule.due_days ?? 14);
  const vars = {
    invoice_number: number,
    total: formatZAR(totals.total),
    due_date: formatDate(dueDate),
    business_name: businessName,
  };
  const subject = fillRecurringTemplate(schedule.email_subject || DEFAULT_RECURRING_SUBJECT, vars);
  const bodyText = fillRecurringTemplate(schedule.email_body || DEFAULT_RECURRING_BODY, vars);

  const html = brandedEmailHtml({
    businessName,
    greeting: `Hi ${client?.contact_person || client?.name || "there"},`,
    bodyText,
    footerNote: `Sent automatically via WinStream on behalf of ${businessName}.`,
  });

  const pdfBase64 = await buildInvoicePdfBase64({
    number,
    title: schedule.title || "Monthly invoice",
    issueDate,
    dueDate,
    items: clean,
    totals,
    vatRate: schedule.vat_rate ?? 15,
    notes: schedule.notes ?? schedule.email_body ?? null,
    terms: schedule.terms,
    client,
    profile,
  });

  try {
    await sendViaResend({
      to: toEmail,
      subject,
      html,
      fromName: businessName,
      replyTo: profile?.email ?? null,
      attachments: pdfBase64
        ? [{ filename: `Invoice-${number}.pdf`, content: pdfBase64 }]
        : undefined,
    });
    await supabase.from("nudge_log").insert({
      user_id: schedule.user_id,
      record_type: "invoice",
      record_id: invoice.id,
      sent_to: toEmail,
      subject,
      status: "sent",
    });
    return { invoiceId: invoice.id, emailed: true };
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 500);
    await supabase.from("nudge_log").insert({
      user_id: schedule.user_id,
      record_type: "invoice",
      record_id: invoice.id,
      sent_to: toEmail,
      subject,
      status: "failed",
      error: msg,
    });
    return { invoiceId: invoice.id, emailed: false, emailError: msg };
  }
}
