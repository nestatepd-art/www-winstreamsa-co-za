import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Browser-reported malfunctions (errors, dead clicks, rage clicks, failed
// requests). Public by necessity — signed-out visitors hit problems too — so
// input is strictly bounded, rate limited per IP, and alerts are de-duplicated.

const Body = z.object({
  kind: z.enum(["js_error", "dead_click", "rage_click", "request_failed", "broken_link"]),
  title: z.string().min(1).max(300),
  path: z.string().max(300).optional(),
  key: z.string().max(300).optional(),
  buildId: z.string().max(80).optional(),
  detail: z.record(z.string().max(60), z.union([z.string().max(1500), z.number(), z.boolean(), z.null()])).optional(),
});

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 25;
const buckets = new Map<string, { count: number; resetAt: number }>();
function allow(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count++;
  return true;
}

const ALLOWED_HOSTS = /(^|\.)winstreamsa\.co\.za$|\.lovable\.app$|^localhost$/;

export const Route = createFileRoute("/api/public/monitor/report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin") || request.headers.get("referer") || "";
        try {
          if (origin && !ALLOWED_HOSTS.test(new URL(origin).hostname)) {
            return new Response(null, { status: 403 });
          }
        } catch {
          return new Response(null, { status: 403 });
        }
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "anonymous";
        if (!allow(ip)) return new Response(null, { status: 429 });

        let parsed: z.infer<typeof Body>;
        try {
          const raw = await request.text();
          if (raw.length > 8000) return new Response(null, { status: 413 });
          parsed = Body.parse(JSON.parse(raw));
        } catch {
          return new Response(null, { status: 400 });
        }

        const { recordMonitorEvent, makeFingerprint } = await import("@/lib/monitor.server");
        const severity = parsed.kind === "js_error" || parsed.kind === "request_failed" ? "critical" : "warning";
        await recordMonitorEvent({
          kind: parsed.kind,
          severity,
          title: parsed.title,
          path: parsed.path ?? null,
          fingerprint: makeFingerprint(parsed.kind, parsed.path, parsed.key || parsed.title),
          buildId: parsed.buildId ?? null,
          userAgent: request.headers.get("user-agent"),
          detail: parsed.detail ?? {},
        });
        return new Response(null, { status: 204 });
      },
    },
  },
});
