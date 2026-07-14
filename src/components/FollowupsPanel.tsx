import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mail, Send, SkipForward, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  listFollowups,
  updateFollowup,
  skipFollowup,
  sendFollowupNow,
  setAutoNudge,
} from "@/lib/followups.functions";

type Props = {
  recordType: "quote" | "invoice";
  recordId: string;
  autoNudgeEnabled: boolean;
  onAutoNudgeChange?: (enabled: boolean) => void;
  /** Optional lazy PDF factory (returns base64 without data URL prefix) */
  getPdfBase64?: () => Promise<{ filename: string; base64: string } | null>;
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  if (status === "sent") return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sent</Badge>;
  if (status === "skipped") return <Badge variant="secondary" className="gap-1"><SkipForward className="h-3 w-3" /> Skipped</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Scheduled</Badge>;
}

export function FollowupsPanel({ recordType, recordId, autoNudgeEnabled, onAutoNudgeChange, getPdfBase64 }: Props) {
  const qc = useQueryClient();
  const list = useServerFn(listFollowups);
  const upd = useServerFn(updateFollowup);
  const skip = useServerFn(skipFollowup);
  const send = useServerFn(sendFollowupNow);
  const toggleAuto = useServerFn(setAutoNudge);

  const queryKey = useMemo(() => ["followups", recordType, recordId], [recordType, recordId]);
  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { recordType, recordId } }),
  });

  const autoMut = useMutation({
    mutationFn: (enabled: boolean) => toggleAuto({ data: { recordType, recordId, enabled } }),
    onSuccess: (_r, enabled) => {
      onAutoNudgeChange?.(enabled);
      toast.success(enabled ? "Automatic follow-ups enabled" : "Automatic follow-ups paused");
    },
    onError: (e: any) => toast.error(e?.message || "Could not update"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <div className="font-medium">Automatic follow-ups</div>
            <div className="text-xs text-muted-foreground">Send the scheduled messages below without you lifting a finger.</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{autoNudgeEnabled ? "Enabled" : "Paused"}</span>
            <Switch
              checked={autoNudgeEnabled}
              onCheckedChange={(v) => autoMut.mutate(v)}
              disabled={autoMut.isPending}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="font-medium">Follow-up messages</div>
          <div className="text-xs text-muted-foreground">Three drafts ready to go. Edit, skip, or send any of them right now.</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <div className="text-sm text-muted-foreground">Loading follow-ups…</div>}
          {!isLoading && rows.length === 0 && (
            <div className="text-sm text-muted-foreground">No follow-ups scheduled yet.</div>
          )}
          {rows.map((row: any) => (
            <FollowupRow
              key={row.id}
              row={row}
              onSave={async (patch) => {
                await upd({ data: { recordType, id: row.id, ...patch } });
                qc.invalidateQueries({ queryKey });
              }}
              onSkip={async () => {
                await skip({ data: { recordType, id: row.id } });
                toast.success("Follow-up skipped");
                qc.invalidateQueries({ queryKey });
              }}
              onSend={async () => {
                const pdf = getPdfBase64 ? await getPdfBase64() : null;
                await send({
                  data: {
                    recordType,
                    id: row.id,
                    pdfBase64: pdf?.base64,
                    pdfFilename: pdf?.filename,
                  },
                });
                toast.success("Follow-up sent");
                qc.invalidateQueries({ queryKey });
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FollowupRow({
  row,
  onSave,
  onSkip,
  onSend,
}: {
  row: any;
  onSave: (patch: { subject?: string; body?: string }) => Promise<void>;
  onSkip: () => Promise<void>;
  onSend: () => Promise<void>;
}) {
  const [subject, setSubject] = useState<string>(row.subject);
  const [body, setBody] = useState<string>(row.body);
  const [sending, setSending] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const readOnly = row.status !== "scheduled";

  useEffect(() => { setSubject(row.subject); setBody(row.body); }, [row.subject, row.body]);

  const saveIfChanged = async () => {
    const patch: { subject?: string; body?: string } = {};
    if (subject !== row.subject) patch.subject = subject;
    if (body !== row.body) patch.body = body;
    if (Object.keys(patch).length === 0) return;
    try { await onSave(patch); } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Follow-up {row.sequence}</span>
          <span className="text-muted-foreground">— day {[3, row.recordType === "invoice" ? 10 : 7, row.recordType === "invoice" ? 21 : 14][row.sequence - 1] ?? row.sequence}</span>
          <span className="ml-2">{statusBadge(row.status)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {row.status === "sent" && row.sent_at ? `Sent ${formatDT(row.sent_at)}` : `Scheduled for ${formatDT(row.scheduled_for)}`}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        <span>Email</span>
      </div>

      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        onBlur={saveIfChanged}
        placeholder="Subject"
        disabled={readOnly}
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={saveIfChanged}
        placeholder="Body"
        rows={5}
        disabled={readOnly}
      />

      {row.error && (
        <div className="text-xs text-destructive">Last error: {row.error}</div>
      )}

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setSkipping(true);
              try { await onSkip(); } finally { setSkipping(false); }
            }}
            disabled={skipping || sending}
          >
            {skipping ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SkipForward className="h-4 w-4 mr-1" />}
            Skip
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await saveIfChanged();
              setSending(true);
              try { await onSend(); } catch (e: any) { toast.error(e?.message || "Send failed"); }
              finally { setSending(false); }
            }}
            disabled={sending || skipping}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Send now
          </Button>
        </div>
      )}
    </div>
  );
}
