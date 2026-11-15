import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only administrators can view the monitor");
}

export const listMonitorEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("monitor_events")
      .select("id, kind, severity, title, path, build_id, notified, created_at, detail")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((r) => ({
      id: String(r.id),
      kind: String(r.kind),
      severity: String(r.severity),
      title: String(r.title),
      path: (r.path as string | null) ?? null,
      build_id: (r.build_id as string | null) ?? null,
      notified: !!r.notified,
      created_at: String(r.created_at),
      detailJson: JSON.stringify(r.detail ?? {}, null, 2),
    }));
  });

export const sendMonitorTestAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { recordMonitorEvent, MONITOR_ALERT_TO } = await import("./monitor.server");
    const res = await recordMonitorEvent({
      kind: "check_failed",
      severity: "info",
      title: "Test alert — the WinStream monitor is working",
      fingerprint: `test|${Date.now()}`,
      detail: { Note: "Sent from the admin Monitor page to confirm alerts arrive." },
    });
    return { ok: res.notified, to: MONITOR_ALERT_TO };
  });
