/** Client-side helpers for send results returned by the email server functions. */
export type SendResult =
  | { ok: true; to: string }
  | { ok: false; reason: string; to?: string; message?: string };

/**
 * Returns a readable message when the client's address can't receive email.
 * Callers must show it and NOT fall back to the mail app — that would bounce too.
 */
export function undeliverableFromResult(res: unknown): string | null {
  const r = res as { ok?: boolean; reason?: string; message?: string; to?: string } | null;
  if (r && r.ok === false && r.reason === "RECIPIENT_UNDELIVERABLE") {
    return r.message || `The email address ${r.to ?? ""} can't receive mail. Please update it and try again.`;
  }
  return null;
}
