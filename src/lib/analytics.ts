import posthog from "posthog-js";

const POSTHOG_KEY = "phc_rpD9U82r6CExiSo6ahjkUsHhHJduAiNxtJ7Wic9tLcGe";
const POSTHOG_HOST = "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // SPA-safe: capture a pageview on every history change, not just first load.
    capture_pageview: false, // driven manually from the router so every SPA route change is captured exactly once
    capture_pageleave: true,
    autocapture: true,
    capture_dead_clicks: true,
    rageclick: true,
    capture_exceptions: true,
    person_profiles: "always",
    persistence: "localStorage+cookie",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    disable_session_recording: false,
    loaded: (ph) => {
      ph.startSessionRecording();
    },
  });
}

/** Manual pageview — used by the router subscription as a safety net. */
export function trackPageview(path: string) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture("$pageview", {
      $current_url: window.location.origin + path,
      pathname: path,
    });
  } catch {}
}

export function identifyUser(userId: string, email?: string | null) {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(userId, email ? { email } : undefined);
  } catch {}
}

export function resetAnalytics() {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch {}
}

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, props);
  } catch {}
}
