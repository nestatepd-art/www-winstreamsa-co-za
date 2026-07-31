import { createFileRoute } from "@tanstack/react-router";

type CheckResult = {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  latency_ms: number | null;
  detail: string;
};

async function timed(fn: () => Promise<Response>) {
  const started = Date.now();
  try {
    const res = await fn();
    return { ok: res.ok || res.status === 401 || res.status === 404, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;

        const checks: CheckResult[] = [
          {
            id: "web",
            name: "Web app",
            status: "operational",
            latency_ms: 0,
            detail: "Serving requests",
          },
        ];

        if (url && key) {
          // Database (PostgREST) — public, unauthenticated reachability probe.
          const db = await timed(() =>
            fetch(`${url}/rest/v1/`, { headers: { apikey: key } }),
          );
          checks.push({
            id: "database",
            name: "Database & API",
            status: db.ok ? (db.ms > 2000 ? "degraded" : "operational") : "down",
            latency_ms: db.ms,
            detail: db.ok ? "Responding normally" : "Not reachable",
          });

          // Auth service reachability.
          const auth = await timed(() =>
            fetch(`${url}/auth/v1/health`, { headers: { apikey: key } }),
          );
          checks.push({
            id: "auth",
            name: "Sign-in & accounts",
            status: auth.ok ? (auth.ms > 2000 ? "degraded" : "operational") : "down",
            latency_ms: auth.ms,
            detail: auth.ok ? "Responding normally" : "Not reachable",
          });

          // Storage (logos, document assets).
          const storage = await timed(() =>
            fetch(`${url}/storage/v1/bucket`, { headers: { apikey: key } }),
          );
          checks.push({
            id: "storage",
            name: "File storage",
            status: storage.ok ? (storage.ms > 2000 ? "degraded" : "operational") : "down",
            latency_ms: storage.ms,
            detail: storage.ok ? "Responding normally" : "Not reachable",
          });
        }

        const overall = checks.some((c) => c.status === "down")
          ? "down"
          : checks.some((c) => c.status === "degraded")
            ? "degraded"
            : "operational";

        return Response.json(
          { overall, checked_at: new Date().toISOString(), checks },
          {
            headers: {
              "cache-control": "no-store",
              "access-control-allow-origin": "*",
            },
          },
        );
      },
    },
  },
});
