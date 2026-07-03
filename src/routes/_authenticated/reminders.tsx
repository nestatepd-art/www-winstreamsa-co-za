import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: RemindersPage,
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  failed: "destructive",
  skipped: "outline",
};

function RemindersPage() {
  const { data: log = [] } = useQuery({
    queryKey: ["nudge-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nudge_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Reminders</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Automatic follow-ups sent daily for overdue invoices and quiet quotes. Master switch lives in Settings.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {log.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              No reminders sent yet. As invoices become overdue or quotes go quiet, WinStream will nudge clients automatically.
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="col-span-2">Type</div>
                <div className="col-span-4">Recipient</div>
                <div className="col-span-4">Subject</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Sent</div>
              </div>
              {log.map((row: any) => (
                <div key={row.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-2 capitalize text-sm">{row.record_type}</div>
                  <div className="col-span-4 text-sm truncate">{row.sent_to}</div>
                  <div className="col-span-4 text-sm truncate text-muted-foreground">{row.subject}</div>
                  <div className="col-span-1">
                    <Badge variant={STATUS_VARIANT[row.status] ?? "outline"} className="capitalize">{row.status}</Badge>
                  </div>
                  <div className="col-span-1 text-right text-xs text-muted-foreground">{timeAgo(row.sent_at)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
