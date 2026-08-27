import { sendViaResend, brandedEmailHtml } from "./resend-send.server";

export type RecurringItem = { description: string; quantity: number; unit_price: number };

export function computeTotals(items: RecurringItem[], vatRate: number) {
  const subtotal = +items
    .reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)
    .toFixed(2);
  const vat_amount = +((subtotal * Number(vatRate || 0)) / 100).toFixed(2);
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
  const clean = items.filter((it) => (it.description ?? "").trim());
  const totals = computeTotals(clean, schedule.vat_rate ?? 15);
  const today = new Date();
  const issueDate = today.toISOString().slice(0, 10);
  const number = invoiceNumber();

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
      notes: schedule.notes,
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

  const subject = (schedule.email_subject || `Invoice ${number} from ${businessName}`).replace(
    "{invoice_number}",
    number,
  );
  const bodyText = (
    schedule.email_body ||
    `Please find your invoice ${number} for this month, totalling R ${totals.total.toFixed(2)}.\n\nPayment is due by ${addDays(today, schedule.due_days ?? 14)}.\n\nThank you for your continued business.`
  ).replace(/\{invoice_number\}/g, number);

  const html = brandedEmailHtml({
    businessName,
    greeting: `Hi ${client?.contact_person || client?.name || "there"},`,
    bodyText,
    footerNote: `Sent automatically via WinStream on behalf of ${businessName}.`,
  });

  try {
    await sendViaResend({
      to: toEmail,
      subject,
      html,
      fromName: businessName,
      replyTo: profile?.email ?? null,
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
