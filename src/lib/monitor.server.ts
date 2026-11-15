/**
 * App monitoring: records malfunctions and emails an alert to the operator.
 * Server-only. Alerts are de-duplicated per fingerprint so one recurring
 * problem produces one email per window, not a flood.
 */
import { createClient } from "@supabase/supabase-js";
import { BUILD_INFO } from "./build-info";

export const MONITOR_ALERT_TO = "sales@nativedigital.co.za";
const DEFAULT_DEDUPE_HOURS = 6;
const MAX_ALERTS_PER_HOUR = 40;

export type MonitorKind =
  | "js_error"
  | "dead_click"
  | "rage_click"
  | "request_failed"
  | "broken_link"
  | "server_error"
  | "check_failed"
  | "email_undelivered"
  | "email_blocked"
  | "deploy";

export type MonitorEventInput = {
  kind: MonitorKind;
  title: string;
  severity?: "info" | "warning" | "critical";
  fingerprint?: string;
  path?: string | null;
  detail?: Record<string, unknown>;
  userAgent?: string | null;
  buildId?: string | null;
  /** Hours during which the same fingerprint will not email again. */
  dedupeHours?: number;
  /** Extra "what changed" lines for deploy notices. */
  changes?: { change: string; userImpact: string }[];
};

export const USER_IMPACT: Record<MonitorKind, string> = {
  js_error:
    "A screen hit an error. The user may have seen a blank or broken page, or the feature they were using stopped responding.",
  dead_click:
    "The user clicked or tapped something that did nothing. They most likely believed the button or link was broken.",
  rage_click:
    "The user clicked the same spot repeatedly in quick succession — a sign of frustration because the feature was slow or unresponsive.",
  request_failed:
    "An action the user took (saving, sending, loading data) failed on the server. Their work may not have been saved or sent.",
  broken_link:
    "A visitor followed a link to a page that doesn't exist and saw a 'Page not found' screen instead of what they were looking for.",
  server_error: "A page failed to load on the server and the user saw an error page instead of the app.",
  check_failed:
    "An automatic health check found a page or service not working. Every user reaching it is affected until it is fixed.",
  email_undelivered:
    "An email the app sent never reached the recipient. The business owner may believe their client received a quote, invoice or reminder that was actually lost.",
  email_blocked:
    "The app refused to send an email because the client's address can't receive mail. The user was shown a message asking them to correct the address.",
  deploy: "A new version of the app is now running. The changes and their effect on users are listed below.",
};

let _admin: ReturnType<typeof createClient> | null = null;
export function monitorDb() {
  if (!_admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _admin = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false },
      // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
  }
  return _admin as any;
}

/** Collapse ids/numbers in paths so /quotes/<uuid> groups as one problem. */
export function normalizePath(path?: string | null) {
  if (!path) return "";
  return path
    .split("?")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:n")
    .slice(0, 160);
}

export function makeFingerprint(kind: string, path: string | null | undefined, key: string) {
  return `${kind}|${normalizePath(path)}|${key.replace(/\s+/g, " ").trim().slice(0, 140)}`;
}

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sast(d = new Date()) {
  return d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false }) + " (SAST)";
}

export function alertEmailHtml(ev: MonitorEventInput, occurrences: number) {
  const sevColor = ev.severity === "critical" ? "#dc2626" : ev.severity === "info" ? "#0891b2" : "#d97706";
  const rows = Object.entries(ev.detail ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;color:#666;font-size:12px;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 10px;font-size:12px;color:#111;word-break:break-word;white-space:pre-wrap">${esc(typeof v === "string" ? v : JSON.stringify(v, null, 1)).slice(0, 2000)}</td></tr>`,
    )
    .join("");
  const changes = (ev.changes ?? [])
    .map(
      (c) =>
        `<li style="margin:0 0 10px"><b>${esc(c.change)}</b><br/><span style="color:#555">Effect on users: ${esc(c.userImpact)}</span></li>`,
    )
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f8;margin:0;padding:24px">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #eee">
  <p style="margin:0 0 8px"><span style="display:inline-block;background:${sevColor};color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;text-transform:uppercase">${esc(ev.severity ?? "warning")}</span> <span style="color:#888;font-size:12px">${esc(ev.kind.replace(/_/g, " "))}</span></p>
  <h2 style="margin:0 0 14px;color:#111;font-size:18px">${esc(ev.title)}</h2>
  <h3 style="margin:0 0 6px;font-size:13px;color:#111">Effect on user experience</h3>
  <p style="margin:0 0 16px;color:#333;line-height:1.5;font-size:14px">${esc(USER_IMPACT[ev.kind])}</p>
  ${changes ? `<h3 style="margin:0 0 6px;font-size:13px;color:#111">What changed</h3><ul style="margin:0 0 16px;padding-left:18px;color:#333;font-size:13px;line-height:1.45">${changes}</ul>` : ""}
  <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #eee;border-radius:6px;margin-bottom:14px">
    <tr><td style="padding:6px 10px;color:#666;font-size:12px">When</td><td style="padding:6px 10px;font-size:12px">${esc(sast())}</td></tr>
    ${ev.path ? `<tr><td style="padding:6px 10px;color:#666;font-size:12px">Page</td><td style="padding:6px 10px;font-size:12px">${esc(ev.path)}</td></tr>` : ""}
    <tr><td style="padding:6px 10px;color:#666;font-size:12px">App version</td><td style="padding:6px 10px;font-size:12px">${esc(ev.buildId || BUILD_INFO.id)}</td></tr>
    ${occurrences > 1 ? `<tr><td style="padding:6px 10px;color:#666;font-size:12px">Occurrences (recent)</td><td style="padding:6px 10px;font-size:12px">${occurrences}</td></tr>` : ""}
    ${ev.userAgent ? `<tr><td style="padding:6px 10px;color:#666;font-size:12px">Device</td><td style="padding:6px 10px;font-size:12px">${esc(ev.userAgent).slice(0, 200)}</td></tr>` : ""}
    ${rows}
  </table>
  <p style="margin:0;color:#999;font-size:11px">WinStream monitor — the same problem won't email again for ${ev.dedupeHours ?? DEFAULT_DEDUPE_HOURS} hours. Full log: https://www.winstreamsa.co.za/admin/monitor</p>
</div></body></html>`;
}

/**
 * Store a monitor event and email an alert unless the same problem was
 * already alerted within its de-duplication window. Never throws.
 */
export async function recordMonitorEvent(ev: MonitorEventInput): Promise<{ notified: boolean }> {
  try {
    const db = monitorDb();
    const fingerprint = ev.fingerprint ?? makeFingerprint(ev.kind, ev.path, ev.title);
    const dedupeHours = ev.dedupeHours ?? DEFAULT_DEDUPE_HOURS;
    const since = new Date(Date.now() - dedupeHours * 3600_000).toISOString();

    const { data: prior } = await db
      .from("monitor_events")
      .select("id, notified")
      .eq("fingerprint", fingerprint)
      .gte("created_at", since)
      .limit(50);
    const alreadyNotified = (prior ?? []).some((p: any) => p.notified);

    let notify = !alreadyNotified;
    if (notify) {
      const { count } = await db
        .from("monitor_events")
        .select("id", { count: "exact", head: true })
        .eq("notified", true)
        .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
      if ((count ?? 0) >= MAX_ALERTS_PER_HOUR) notify = false;
    }

    const { data: inserted } = await db
      .from("monitor_events")
      .insert({
        kind: ev.kind,
        severity: ev.severity ?? "warning",
        fingerprint,
        title: ev.title.slice(0, 300),
        detail: { ...(ev.detail ?? {}), ...(ev.changes ? { changes: ev.changes } : {}) },
        path: ev.path?.slice(0, 300) ?? null,
        build_id: ev.buildId ?? BUILD_INFO.id,
        user_agent: ev.userAgent?.slice(0, 300) ?? null,
        notified: false,
      })
      .select("id")
      .single();

    if (!notify) return { notified: false };

    const { sendViaResend } = await import("./resend-send.server");
    await sendViaResend({
      to: MONITOR_ALERT_TO,
      subject: `[WinStream ${ev.severity === "critical" ? "CRITICAL" : ev.kind === "deploy" ? "Update" : "Alert"}] ${ev.title}`.slice(0, 180),
      html: alertEmailHtml({ ...ev, dedupeHours }, (prior?.length ?? 0) + 1),
      fromName: "WinStream Monitor",
      monitor: false,
    });
    if (inserted?.id) await db.from("monitor_events").update({ notified: true }).eq("id", inserted.id);
    return { notified: true };
  } catch (e) {
    console.error("[monitor] failed to record/notify", e);
    return { notified: false };
  }
}

// ---------------------------------------------------------------------------
// Health checks & version announcements
// ---------------------------------------------------------------------------

export const KEY_PAGES = ["/", "/pricing", "/features", "/auth", "/blog", "/status", "/try", "/terms", "/privacy", "/sitemap.xml"];

export function envOfHost(host: string): "live" | "preview" | "dev" {
  if (/^localhost(:\d+)?$|^127\.0\.0\.1/.test(host)) return "dev";
  if (/^id-preview--|-dev\.lovable\.app$|lovableproject\.com$/.test(host)) return "preview";
  return "live";
}

export async function checkPages(origin: string) {
  const failures: { page: string; status: string }[] = [];
  await Promise.all(
    KEY_PAGES.map(async (p) => {
      try {
        const res = await fetch(origin + p, {
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
          headers: { "user-agent": "WinStreamMonitor/1.0" },
        });
        if (res.status >= 400) failures.push({ page: p, status: String(res.status) });
      } catch (e: any) {
        failures.push({ page: p, status: String(e?.name === "TimeoutError" ? "timeout" : e?.message ?? "error").slice(0, 80) });
      }
    }),
  );
  return { total: KEY_PAGES.length, failures };
}

/**
 * Emails a "new version" notice the first time a build serves traffic.
 * Returns true when this build was new.
 */
export async function announceBuildIfNew(env: "live" | "preview"): Promise<boolean> {
  try {
    const { RELEASE_NOTES } = await import("./release-notes");
    const db = monitorDb();
    const stateKey = `build:${env}`;
    const { data: state } = await db.from("monitor_state").select("value").eq("key", stateKey).maybeSingle();
    const prev = (state?.value ?? null) as { id?: string; commits?: string[] } | null;
    if (prev?.id === BUILD_INFO.id) return false;
    await db.from("monitor_state").upsert({
      key: stateKey,
      value: { id: BUILD_INFO.id, builtAt: BUILD_INFO.builtAt, commits: BUILD_INFO.commits },
      updated_at: new Date().toISOString(),
    });
    if (!prev?.id) return true; // first version ever recorded — nothing to compare
    const prevSet = new Set(prev.commits ?? []);
    const newCommits = BUILD_INFO.commits.filter((c) => !prevSet.has(c)).slice(0, 15);
    const smoke = env === "live" ? await checkPages("https://www.winstreamsa.co.za") : null;
    await recordMonitorEvent({
      kind: "deploy",
      severity: smoke?.failures.length ? "critical" : "info",
      title:
        env === "live"
          ? "A new version of WinStream is live"
          : "The WinStream codebase changed (preview — not live yet)",
      fingerprint: `deploy|${env}|${BUILD_INFO.id}`,
      dedupeHours: 24 * 30,
      buildId: BUILD_INFO.id,
      changes: RELEASE_NOTES,
      detail: {
        Environment: env === "live" ? "Live site (www.winstreamsa.co.za)" : "Preview (changes not yet published)",
        "Built at": BUILD_INFO.builtAt,
        "Previous version": prev.id,
        "Code changes": newCommits.length ? newCommits.join("\n") : "(change list unavailable for this build)",
        ...(smoke
          ? {
              "Post-release check": smoke.failures.length
                ? `${smoke.failures.length} of ${smoke.total} key pages FAILING: ${smoke.failures.map((f) => `${f.page} (${f.status})`).join(", ")}`
                : `All ${smoke.total} key pages load normally`,
            }
          : {}),
      },
    });
    return true;
  } catch (e) {
    console.error("[monitor] build announcement failed", e);
    return false;
  }
}
