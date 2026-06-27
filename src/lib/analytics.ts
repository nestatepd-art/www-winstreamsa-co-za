import posthog from "posthog-js";

const POSTHOG_KEY = "phc_rpD9U82r6CExiSo6ahjkUsHhHJduAiNxtJ7Wic9tLcGe";
const POSTHOG_HOST = "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
  });
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
