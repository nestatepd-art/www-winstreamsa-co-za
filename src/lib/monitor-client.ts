/**
 * Browser-side malfunction detector: uncaught errors, dead clicks, rage
 * clicks and failed requests are reported to /api/public/monitor/report,
 * which alerts the operator by email. Runs only on the live site.
 */
import { BUILD_INFO } from "./build-info";

type Report = {
  kind: "js_error" | "dead_click" | "rage_click" | "request_failed" | "broken_link";
  title: string;
  key?: string;
  detail?: Record<string, string | number | boolean | null>;
};

const ENDPOINT = "/api/public/monitor/report";
const MAX_REPORTS_PER_PAGE = 15;
const DEAD_CLICK_MS = 1500;

let installed = false;
let sentCount = 0;
const sentKeys = new Set<string>();
let networkActivity = 0;

function isLiveHost(host: string) {
  return /(^|\.)winstreamsa\.co\.za$/.test(host) || host === "www-winstreamsa-co-za.lovable.app";
}

function send(r: Report) {
  const dedupe = `${r.kind}|${location.pathname}|${r.key ?? r.title}`;
  if (sentKeys.has(dedupe) || sentCount >= MAX_REPORTS_PER_PAGE) return;
  sentKeys.add(dedupe);
  sentCount++;
  const payload = JSON.stringify({
    kind: r.kind,
    title: r.title.slice(0, 300),
    key: (r.key ?? r.title).slice(0, 300),
    path: location.pathname + location.search.slice(0, 80),
    buildId: BUILD_INFO.id.slice(0, 80),
    detail: { ...(r.detail ?? {}), Screen: `${window.innerWidth}x${window.innerHeight}` },
  });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
  } catch {
    /* fall through */
  }
  origFetch?.(ENDPOINT, { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
}

/** Short human description of a clicked element, e.g. `button "Send"`. */
export function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role");
  const label =
    el.getAttribute("aria-label") ||
    (el as HTMLElement).innerText?.trim().replace(/\s+/g, " ").slice(0, 60) ||
    el.getAttribute("title") ||
    el.getAttribute("name") ||
    "";
  const href = tag === "a" ? ` → ${el.getAttribute("href")}` : "";
  return `${role ?? tag} "${label || "(no label)"}"${href}`;
}

const INTERACTIVE =
  'button, a[href], [role="button"], [role="menuitem"], [role="tab"], [role="switch"], [role="checkbox"], [role="option"], summary, input[type="submit"], input[type="button"]';

function ignoredClickTarget(el: Element) {
  if (el.matches(':disabled, [aria-disabled="true"], [data-monitor-ignore]')) return true;
  if (el.closest("[data-monitor-ignore]")) return true;
  if (el.tagName === "A") {
    const a = el as HTMLAnchorElement;
    const href = a.getAttribute("href") ?? "";
    if (a.target === "_blank" || a.hasAttribute("download")) return true;
    if (/^(mailto:|tel:|sms:|whatsapp:|javascript:)/i.test(href)) return true;
    if (a.host && a.host !== location.host) return true;
  }
  return false;
}

let origFetch: typeof fetch | undefined;

export function installMonitor() {
  if (installed || typeof window === "undefined") return;
  const forced = (() => {
    try {
      return localStorage.getItem("ws-monitor-force") === "1";
    } catch {
      return false;
    }
  })();
  if (!isLiveHost(location.hostname) && !forced) return;
  installed = true;

  // ---- Uncaught errors ----
  window.addEventListener("error", (e) => {
    const msg = String(e.message || (e.error as Error)?.message || "");
    if (!msg || msg === "Script error." || /ResizeObserver loop/i.test(msg)) return;
    if (e.filename && !e.filename.startsWith(location.origin)) return; // browser extensions
    send({
      kind: "js_error",
      title: `Screen error: ${msg.slice(0, 140)}`,
      key: msg.slice(0, 200),
      detail: { Message: msg.slice(0, 500), Source: `${e.filename ?? ""}:${e.lineno ?? ""}`, Stack: String((e.error as Error)?.stack ?? "").slice(0, 1200) },
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason: any = e.reason;
    const msg = String(reason?.message ?? reason ?? "");
    if (!msg || /AbortError|The user aborted|cancel/i.test(msg)) return;
    send({
      kind: "js_error",
      title: `Unhandled failure: ${msg.slice(0, 140)}`,
      key: msg.slice(0, 200),
      detail: { Message: msg.slice(0, 500), Stack: String(reason?.stack ?? "").slice(0, 1200) },
    });
  });

  // ---- Failed requests ----
  origFetch = window.fetch.bind(window);
  const supabaseHost = (() => {
    try {
      return new URL(import.meta.env.VITE_SUPABASE_URL as string).host;
    } catch {
      return "";
    }
  })();
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isReport = url.includes(ENDPOINT);
    if (!isReport) networkActivity++;
    try {
      const res = await origFetch!(input, init);
      if (!isReport && res.status >= 500) {
        let host = "";
        let path = url;
        try {
          const u = new URL(url, location.href);
          host = u.host;
          path = u.pathname;
        } catch {
          /* ignore */
        }
        if (host === location.host || host === supabaseHost) {
          send({
            kind: "request_failed",
            title: `Action failed on the server (${res.status}) ${path.startsWith("/_serverFn") ? "while saving/loading data" : path}`.slice(0, 200),
            key: `${res.status}|${path.replace(/[0-9a-f-]{20,}/gi, ":id").slice(0, 120)}`,
            detail: { Status: res.status, Request: `${init?.method ?? "GET"} ${path}`.slice(0, 300) },
          });
        }
      }
      return res;
    } catch (err) {
      if (!isReport && navigator.onLine && !/abort/i.test(String((err as Error)?.name ?? ""))) {
        let sameSite = false;
        try {
          const h = new URL(url, location.href).host;
          sameSite = h === location.host || h === supabaseHost;
        } catch {
          /* ignore */
        }
        if (sameSite) {
          send({
            kind: "request_failed",
            title: "A request could not reach the server",
            key: `network|${url.slice(0, 120)}`,
            detail: { Error: String((err as Error)?.message ?? err).slice(0, 300), Request: url.slice(0, 300) },
          });
        }
      }
      throw err;
    }
  };

  // ---- Dead clicks & rage clicks ----
  let mutations = 0;
  const mo = new MutationObserver((list) => {
    mutations += list.length;
  });
  const startObserver = () =>
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  if (document.body) startObserver();
  else document.addEventListener("DOMContentLoaded", startObserver, { once: true });

  let recent: { t: number; x: number; y: number; el: Element }[] = [];

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as Element | null;
      if (!target || !(target instanceof Element)) return;
      const el = target.closest(INTERACTIVE);

      // Rage click: 3+ clicks on the same spot within 900ms.
      const now = Date.now();
      recent = recent.filter((c) => now - c.t < 900);
      recent.push({ t: now, x: e.clientX, y: e.clientY, el: el ?? target });
      const near = recent.filter((c) => Math.hypot(c.x - e.clientX, c.y - e.clientY) < 30);
      if (near.length >= 3) {
        const desc = describeElement(el ?? target);
        send({ kind: "rage_click", title: `Rage clicks on ${desc}`.slice(0, 200), key: desc, detail: { Element: desc, Clicks: near.length } });
        recent = [];
      }

      if (!el || ignoredClickTarget(el)) return;
      const startMut = mutations;
      const startNet = networkActivity;
      const startUrl = location.href;
      const startFocus = document.activeElement;
      const startScroll = window.scrollY;
      window.setTimeout(() => {
        if (!el.isConnected) return; // element was replaced → something happened
        const nothingHappened =
          mutations === startMut &&
          networkActivity === startNet &&
          location.href === startUrl &&
          document.activeElement === startFocus &&
          Math.abs(window.scrollY - startScroll) < 4 &&
          document.visibilityState === "visible";
        if (nothingHappened) {
          const desc = describeElement(el);
          send({
            kind: "dead_click",
            title: `Dead click on ${desc}`.slice(0, 200),
            key: desc,
            detail: { Element: desc, "What happened": "No page change, navigation, network request or visual update within 1.5 seconds of the click." },
          });
        }
      }, DEAD_CLICK_MS);
    },
    true,
  );
}

/** Lets React error boundaries report crashes caught before window.onerror. */
export function reportBoundaryError(error: unknown) {
  if (!installed) return;
  const msg = String((error as Error)?.message ?? error ?? "Unknown error");
  send({
    kind: "js_error",
    title: `Page crashed: ${msg.slice(0, 140)}`,
    key: msg.slice(0, 200),
    detail: { Message: msg.slice(0, 500), Stack: String((error as Error)?.stack ?? "").slice(0, 1200) },
  });
}

/** A visitor landed on a page that doesn't exist (broken link or bad URL). */
export function reportBrokenLink() {
  if (typeof window === "undefined") return;
  installMonitor();
  if (!installed) return;
  const from = document.referrer && document.referrer.startsWith(location.origin) ? new URL(document.referrer).pathname : document.referrer || "(typed or external)";
  send({
    kind: "broken_link",
    title: `Broken link: ${location.pathname} does not exist`,
    key: location.pathname,
    detail: { "Missing page": location.pathname, "Linked from": from.slice(0, 300) },
  });
}
