import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { draftClientMessage, sendCommunication } from "@/lib/proposals.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageCircle, Sparkles, Loader2, Send, ArrowLeft, Check, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { extractEmailAddress, openEmailDraft } from "@/lib/email-compose";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proposals/$proposalId")({
  component: ProposalDetail,
});

type Channel = "email" | "whatsapp";

function ProposalDetail() {
  const { proposalId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draftMsg = useServerFn(draftClientMessage);
  const sendMsg = useServerFn(sendCommunication);

  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, clients(id, name, email, phone)")
        .eq("id", proposalId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: comms } = useQuery({
    queryKey: ["proposal-comms", proposalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("communications")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("email");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"ai" | "send" | null>(null);

  const client = (proposal as { clients?: { id: string; name: string; email: string | null; phone: string | null } | null } | undefined)?.clients;

  const openComposer = (ch: Channel) => {
    setChannel(ch);
    setTo(ch === "email" ? client?.email ?? "" : client?.phone ?? "");
    setSubject(`Proposal: ${proposal?.title ?? ""}`);
    setBody("");
    setOpen(true);
  };

  const aiCompose = async () => {
    if (!proposal) return;
    setBusy("ai");
    try {
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("business_name, brand_tone")
        .maybeSingle();
      const out = await draftMsg({
        data: {
          channel,
          purpose: "send",
          businessName: profile?.business_name ?? undefined,
          clientName: client?.name,
          proposalTitle: proposal.title,
          tone: profile?.brand_tone ?? undefined,
        },
      });
      if (out.subject) setSubject(out.subject);
      setBody(out.body);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setBusy(null);
    }
  };

  const doSend = async () => {
    if (!to.trim() || !body.trim()) return toast.error("Recipient and message are required");
    setBusy("send");
    try {
      if (channel === "email") {
        const email = extractEmailAddress(to);
        if (!email) {
          toast.error("Enter a valid recipient email address");
          return;
        }
        // Generate a simple text-based PDF of the proposal content
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ unit: "pt", format: "a4" });
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text(proposal?.title ?? "Proposal", 40, 60);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(90);
        pdf.text(`Prepared for ${client?.name ?? ""}`, 40, 80);
        pdf.setTextColor(30);
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(proposal?.content ?? "", 515);
        let y = 110;
        for (const ln of lines) {
          if (y > 800) { pdf.addPage(); y = 60; }
          pdf.text(ln, 40, y);
          y += 15;
        }
        const blob = pdf.output("blob");
        const filename = `Proposal-${(proposal?.title ?? "proposal").replace(/[^a-z0-9]+/gi, "-")}.pdf`;
        const result = await openEmailDraft({ to: email, subject, body, attachment: { blob, filename } });
        if (!result) throw new Error("Email draft could not be opened. Please check your default mail app.");
      } else {
        const phone = to.trim().replace(/[^\d+]/g, "").replace(/^\+/, "");
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
      await sendMsg({
        data: {
          channel,
          toAddress: to.trim(),
          subject: channel === "email" ? subject : null,
          body,
          proposalId,
          clientId: client?.id ?? null,
        },
      });
      toast.success(`${channel === "email" ? "Email" : "WhatsApp"} opened — review and hit send in your ${channel === "email" ? "mail client" : "WhatsApp"}.`);
      import("@/lib/analytics").then(({ track }) =>
        track("proposal_sent", { proposal_id: proposalId, channel }),
      );
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposal-comms", proposalId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(null);
    }
  };

  const markAccepted = async () => {
    await supabase.from("proposals")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", proposalId);
    qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
    toast.success("Marked as accepted");
  };

  if (!proposal) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/proposals" })}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Proposals
      </Button>

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{proposal.title}</h1>
            <Badge variant="outline" className="capitalize">{proposal.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {client?.name ?? "No client"} · created {formatDate(proposal.created_at)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => openComposer("email")}>
                <Mail className="h-4 w-4 mr-2" /> Send email
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button onClick={() => openComposer("whatsapp")}>
                <MessageCircle className="h-4 w-4 mr-2" /> Send WhatsApp
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {channel === "email" ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                  Send via {channel === "email" ? "Email" : "WhatsApp"}
                </DialogTitle>
                <DialogDescription>
                  Opens your {channel === "email" ? "mail client" : "WhatsApp"} with the message prefilled. The send is also logged to this proposal's timeline.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{channel === "email" ? "To (email)" : "To (WhatsApp number, e.g. +27821234567)"}</Label>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                {channel === "email" && (
                  <div className="space-y-1.5">
                    <Label>Subject</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Message</Label>
                    <Button size="sm" variant="ghost" onClick={aiCompose} disabled={busy === "ai"}>
                      {busy === "ai" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      AI draft
                    </Button>
                  </div>
                  <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={doSend} disabled={busy === "send"}>
                  {busy === "send" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {proposal.status !== "accepted" && (
            <Button variant="secondary" onClick={markAccepted}>
              <Check className="h-4 w-4 mr-2" /> Mark accepted
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete proposal"
            onClick={async () => {
              if (!confirm(`Delete proposal "${proposal.title}"? This cannot be undone.`)) return;
              const { error } = await supabase.from("proposals").delete().eq("id", proposalId);
              if (error) { toast.error(error.message); return; }
              toast.success("Proposal deleted");
              qc.invalidateQueries({ queryKey: ["proposals"] });
              navigate({ to: "/proposals" });
            }}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Proposal</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({comms?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <Card>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                {proposal.content || "(empty)"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Communications</CardTitle>
              <CardDescription>Every email and WhatsApp sent for this proposal.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!comms || comms.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No messages sent yet.
                </div>
              ) : (
                <ul className="divide-y">
                  {comms.map((c) => (
                    <li key={c.id} className="p-4 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {c.channel === "email" ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                          <span className="capitalize">{c.channel}</span>
                          <span className="text-muted-foreground font-normal">→ {c.to_address}</span>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{c.status}</Badge>
                      </div>
                      {c.subject && <div className="text-sm font-medium">{c.subject}</div>}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{c.body}</p>
                      <div className="text-xs text-muted-foreground">{formatDate(c.created_at)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
