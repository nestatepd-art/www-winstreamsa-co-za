/** Shared default wording for recurring invoice emails (prefilled in the UI, used as fallback on send). */

export const DEFAULT_RECURRING_SUBJECT = "Invoice {invoice_number} — {business_name}";

export const DEFAULT_RECURRING_BODY = [
  "Please find attached invoice {invoice_number} for this month's services, totalling {total}.",
  "Payment is due by {due_date}. Our banking details appear on the attached PDF invoice — kindly use the invoice number as your payment reference.",
  "If anything on this invoice needs adjusting, simply reply to this email and we'll sort it out right away.",
  "Thank you for your continued business.",
  "Kind regards,\n{business_name}",
].join("\n\n");

export function fillRecurringTemplate(
  template: string,
  vars: { invoice_number: string; total: string; due_date: string; business_name: string },
): string {
  return template
    .replace(/\{invoice_number\}/g, vars.invoice_number)
    .replace(/\{total\}/g, vars.total)
    .replace(/\{due_date\}/g, vars.due_date)
    .replace(/\{business_name\}/g, vars.business_name);
}
