/** Signed-in sessions end after this much inactivity. */
export const IDLE_LIMIT_MS = 15 * 60 * 1000;
/** Warn the user this long before the idle sign-out. */
export const IDLE_WARNING_MS = 60 * 1000;

export const IDLE_ACTIVITY_KEY = "winstream:last-activity";
export const IDLE_LOGOUT_FLAG = "winstream:idle-logout";

export type IdleState = "active" | "warning" | "expired";

export function idleState(lastActivity: number, now: number, limit = IDLE_LIMIT_MS, warning = IDLE_WARNING_MS): IdleState {
  const idle = now - lastActivity;
  if (idle >= limit) return "expired";
  if (idle >= limit - warning) return "warning";
  return "active";
}

export function readLastActivity(): number | null {
  try {
    const raw = window.localStorage.getItem(IDLE_ACTIVITY_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function markActivity(now = Date.now()) {
  try {
    window.localStorage.setItem(IDLE_ACTIVITY_KEY, String(now));
  } catch {
    /* storage unavailable */
  }
}

/** Called from sign-in screens so a fresh sign-in never inherits an old idle clock. */
export function resetIdleClock() {
  try {
    window.localStorage.removeItem(IDLE_ACTIVITY_KEY);
  } catch {
    /* storage unavailable */
  }
}
