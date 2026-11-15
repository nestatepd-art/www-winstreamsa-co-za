import { createFileRoute } from "@tanstack/react-router";

// Scheduled hourly backstop: page and service checks, plus emails that bounced
// after sending. Real-user problems are reported instantly by the browser
// monitor; new versions are announced on their first request (src/server.ts).

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export const Route = createFileRoute("/api/public/monitor/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { recordMonitorEvent, monitorDb, checkPages, envOfHost } = await import("@/lib/monitor.server");
        const { BUILD_INFO } = await import("@/lib/build-info");
        const db = monitorDb();
        const url = new URL(request.url);
        const env = envOfHost(url.host) === "live" ? "live" : "preview";
        const origin = env === "live" ? "https://www.winstreamsa.co.za" : url.origin;
        const out: Record<string, unknown> = { env, build: BUILD_INFO.id };

        // ---- 1. New version (also announced on the first request a new version serves) ----
        const { announceBuildIfNew } = await import("@/lib/monitor.server");
        out.newBuild = await announceBuildIfNew(env);

        if (env !== "live") return Response.json({ ok: true, ...out });

        // ---- 2. Key pages ----
        const pages = await checkPages(origin);
        for (const f of pages.failures) {
          await recordMonitorEvent({
            kind: "check_failed",
            severity: "critical",
            title: `Page ${f.page} is not loading (${f.status})`,
            fingerprint: `page|${f.page}|${f.status}`,
            path: f.page,
            detail: { Page: origin + f.page, Result: f.status },
          });
        }
        out.pages = pages;

        // ---- 3. Backend services ----
        try {
          const res = await fetch(`${origin}/api/public/health`, { signal: AbortSignal.timeout(15000) });
          const health: any = await res.json();
          for (const c of health?.checks ?? []) {
            if (c.status !== "operational") {
              await recordMonitorEvent({
                kind: "check_failed",
                severity: c.status === "down" ? "critical" : "warning",
                title: `${c.name} is ${c.status}`,
                fingerprint: `service|${c.id}|${c.status}`,
                detail: { Service: c.name, Status: c.status, Detail: c.detail, "Response time": `${c.latency_ms} ms` },
              });
            }
          }
        } catch {
          /* page check above already reports an unreachable health endpoint */
        }

        // ---- 4. Email delivery ----
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (LOVABLE_API_KEY && RESEND_API_KEY) {
          const headers = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": RESEND_API_KEY };
          try {
            const dom = await fetch(`${GATEWAY_URL}/domains`, { headers });
            const dj: any = await dom.json();
            const verified = (dj?.data ?? []).some((d: any) => d?.status === "verified");
            if (!verified) {
              await recordMonitorEvent({
                kind: "check_failed",
                severity: "critical",
                title: "Email sending domain is no longer verified — client emails will fail",
                fingerprint: "email_domain_unverified",
                detail: { Domains: JSON.stringify((dj?.data ?? []).map((d: any) => `${d.name}: ${d.status}`)) },
              });
            }
            const list = await fetch(`${GATEWAY_URL}/emails?limit=100`, { headers });
            const lj: any = await list.json();
            const cutoff = Date.now() - 3 * 86400_000;
            let undelivered = 0;
            for (const e of lj?.data ?? []) {
              const ev = String(e?.last_event ?? "");
              if (!["bounced", "suppressed", "complained", "failed"].includes(ev)) continue;
              if (new Date(String(e.created_at).replace(" ", "T")).getTime() < cutoff) continue;
              undelivered++;
              await recordMonitorEvent({
                kind: "email_undelivered",
                severity: "warning",
                title: `Email to ${e.to?.[0]} was ${ev}`,
                fingerprint: `email|${e.id}`,
                dedupeHours: 24 * 30,
                detail: {
                  Recipient: (e.to ?? []).join(", "),
                  Sender: e.from,
                  Subject: e.subject,
                  "Sent at": e.created_at,
                  Outcome: ev === "suppressed" ? "Blocked by the email service because this address bounced before" : ev,
                },
              });
            }
            out.undeliveredEmails = undelivered;
          } catch (e: any) {
            await recordMonitorEvent({
              kind: "check_failed",
              severity: "critical",
              title: "Email service could not be reached",
              fingerprint: "email_service_unreachable",
              detail: { Error: String(e?.message ?? e).slice(0, 300) },
            });
          }
        }

        // ---- 5. Housekeeping: keep 60 days of history ----
        await db.from("monitor_events").delete().lt("created_at", new Date(Date.now() - 60 * 86400_000).toISOString());

        return Response.json({ ok: true, ...out, checked_at: new Date().toISOString() });
      },
    },
  },
});
