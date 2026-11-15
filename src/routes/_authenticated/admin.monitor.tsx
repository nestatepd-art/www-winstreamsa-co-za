import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, BellRing, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { listMonitorEvents, sendMonitorTestAlert } from "@/lib/monitor.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/monitor")({
  head: () => ({ meta: [{ title: "App monitor — WinStream" }, { name: "robots", content: "noindex" }] }),
  component: MonitorPage,
});

const KIND_LABEL: Record<string, string> = {
  js_error: "Screen error",
  dead_click: "Dead click",
  rage_click: "Rage clicks",
  request_failed: "Failed action",
  broken_link: "Broken link",
  server_error: "Server error",
  check_failed: "Health check",
  email_undelivered: "Email not delivered",
  email_blocked: "Email blocked",
  deploy: "New version",
};

function MonitorPage() {
  const listFn = useServerFn(listMonitorEvents);
  const testFn = useServerFn(sendMonitorTestAlert);
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["monitor-events"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await testFn();
      if (res.ok) toast.success(`Test alert emailed to ${res.to}`);
      else toast.error("The test alert could not be emailed — check the log below.");
      qc.invalidateQueries({ queryKey: ["monitor-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error)
    return <div className="p-8 text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</div>;

  const events = data ?? [];
  const last24 = events.filter((e) => Date.now() - new Date(e.created_at).getTime() < 86400_000);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" /> App monitor
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Errors, dead clicks, rage clicks, failed actions, broken links, undelivered emails, failed health checks
            and new versions. Each new problem emails <b>sales@nativedigital.co.za</b> immediately (repeats are grouped).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["monitor-events"] })}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={sendTest} disabled={testing}>
            <BellRing className="h-4 w-4 mr-1" /> {testing ? "Sending…" : "Send test alert"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Events (24h)", value: last24.length },
          { label: "Critical (24h)", value: last24.filter((e) => e.severity === "critical").length },
          { label: "Alerts emailed (24h)", value: last24.filter((e) => e.notified).length },
          { label: "Dead/rage clicks (24h)", value: last24.filter((e) => e.kind === "dead_click" || e.kind === "rage_click").length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          No problems recorded yet.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {events.map((e) => (
            <li key={e.id} className="p-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpen(open === e.id ? null : e.id)}
                aria-expanded={open === e.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={e.severity === "critical" ? "destructive" : "secondary"}>{KIND_LABEL[e.kind] ?? e.kind}</Badge>
                  <span className="font-medium text-sm">{e.title}</span>
                  {e.notified && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <Mail className="h-3 w-3" /> emailed
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
                  {e.path ? ` · ${e.path}` : ""}
                  {e.build_id ? ` · version ${e.build_id}` : ""}
                </div>
              </button>
              {open === e.id && (
                <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">
                  {e.detailJson}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
