import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";

type Check = {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  latency_ms: number | null;
  detail: string;
};

type Health = {
  overall: "operational" | "degraded" | "down";
  checked_at: string;
  checks: Check[];
};

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — WinStream SA Uptime & Service Health" },
      {
        name: "description",
        content:
          "Live service health for WinStream SA: web app, database, sign-in, file storage, email and payments, with current uptime targets.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "System Status — WinStream SA" },
      {
        property: "og:description",
        content: "Real-time service health and uptime information for WinStream SA.",
      },
      { property: "og:url", content: "https://www.winstreamsa.co.za/status" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "System Status — WinStream SA" },
      {
        name: "twitter:description",
        content: "Real-time service health and uptime information for WinStream SA.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.winstreamsa.co.za/status" }],
  }),
  component: StatusPage,
});

const LABEL: Record<Check["status"], string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Outage",
};

function StatusIcon({ status, className }: { status: Check["status"]; className?: string }) {
  if (status === "operational") return <CheckCircle2 className={className} />;
  if (status === "degraded") return <AlertTriangle className={className} />;
  return <XCircle className={className} />;
}

function tone(status: Check["status"]) {
  if (status === "operational") return "text-emerald-400";
  if (status === "degraded") return "text-amber-400";
  return "text-red-400";
}

const DEPENDENCIES = [
  { name: "Payments (Paddle)", href: "https://status.paddle.com" },
  { name: "Email delivery (Resend)", href: "https://resend-status.com" },
  { name: "Hosting & edge network", href: "https://www.cloudflarestatus.com" },
];

function StatusPage() {
  const { data, isFetching, refetch, isError } = useQuery<Health>({
    queryKey: ["public-health"],
    queryFn: async () => {
      const res = await fetch("/api/public/health", { cache: "no-store" });
      if (!res.ok) throw new Error("health check failed");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const overall = isError ? "down" : (data?.overall ?? "operational");

  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-4xl font-bold tracking-tight">System status</h1>
        <p className="mt-3 text-white/60">
          Live health checks for WinStream SA, refreshed automatically every minute.
        </p>

        <section
          className={`mt-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6`}
        >
          <StatusIcon status={overall} className={`h-9 w-9 shrink-0 ${tone(overall)}`} />
          <div className="min-w-0">
            <p className="text-lg font-semibold">
              {overall === "operational"
                ? "All systems operational"
                : overall === "degraded"
                  ? "Some systems degraded"
                  : "We're investigating an issue"}
            </p>
            <p className="text-sm text-white/50">
              {data?.checked_at
                ? `Last checked ${new Date(data.checked_at).toLocaleString("en-ZA")}`
                : "Checking…"}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Services</h2>
          <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {(data?.checks ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-4">
                <StatusIcon status={c.status} className={`h-5 w-5 shrink-0 ${tone(c.status)}`} />
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-white/50">{c.detail}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className={`text-sm font-medium ${tone(c.status)}`}>{LABEL[c.status]}</p>
                  {typeof c.latency_ms === "number" && c.latency_ms > 0 && (
                    <p className="text-xs text-white/40">{c.latency_ms} ms</p>
                  )}
                </div>
              </li>
            ))}
            {!data && !isError && (
              <li className="px-5 py-4 text-sm text-white/50">Running checks…</li>
            )}
            {isError && (
              <li className="px-5 py-4 text-sm text-red-400">
                Health checks could not be reached from your browser.
              </li>
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Third-party dependencies</h2>
          <p className="mt-2 text-sm text-white/50">
            Parts of WinStream SA rely on external providers. These publish their own status
            pages:
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {DEPENDENCIES.map((d) => (
              <li key={d.name}>
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 underline underline-offset-4 hover:text-white"
                >
                  {d.name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          <h2 className="text-xl font-semibold text-white">Uptime & incidents</h2>
          <p className="mt-3">
            Our availability target is 99.9% monthly uptime for the web app and core services.
            The checks above are run live when this page loads and every 60 seconds thereafter;
            they reflect current reachability rather than a historical average.
          </p>
          <p className="mt-3">
            There are no scheduled maintenance windows at present. Material incidents and any
            planned maintenance will be announced in-app and by email to affected accounts.
          </p>
          <p className="mt-3">
            Seeing something we're not? Email{" "}
            <a
              className="text-white underline underline-offset-4"
              href="mailto:info@winstreamsa.co.za?subject=Status%20report"
            >
              info@winstreamsa.co.za
            </a>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
