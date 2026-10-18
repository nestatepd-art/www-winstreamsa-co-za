export const NUDGE_ACTIONS = ["yes", "no", "cancel_all"] as const;
export function approvalState(confirmation: { status: string; expires_at: string } | null, now = Date.now()) {
  if (!confirmation) return "missing";
  if (confirmation.status !== "pending") return "handled";
  if (new Date(confirmation.expires_at).getTime() <= now) return "expired";
  return "pending";
}
export function escapeApprovalHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}