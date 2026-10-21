import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { draftClientMessage, draftProposal } from "@/lib/proposals.functions";
import { sendProposalNow } from "@/lib/proposal-send.functions";

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
import { Mail, MessageCircle, Sparkles, Loader2, Send, ArrowLeft, Check, Trash2, Pencil, Download, Save } from "lucide-react";
import { formatDate } from "@/lib/format";
import { extractEmailAddress } from "@/lib/email-compose";
import { toast } from "sonner";
import { useConsumeQuota } from "@/hooks/use-credits";
import { useLogoAsset } from "@/hooks/use-logo-asset";
import { useEditAutosave } from "@/lib/edit-autosave";
import { generateProposalPdf, proposalFilename } from "@/lib/proposal-pdf";
import { downloadBlob } from "@/lib/pdf-export";
import { ProposalPdfPreview } from "@/components/ProposalPdfPreview";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/proposals/$proposalId")({
  head: () => ({ meta: [
    { title: "Proposal workspace | WinStream SA" },
    { name: "description", content: "Edit, review, download and email your WinStream SA business proposal." },
    { property: "og:title", content: "Proposal workspace | WinStream SA" },
    { property: "og:description", content: "Review and send your professional business proposal." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ProposalDetail,
});

type Channel = "email" | "whatsapp";

function ProposalDetail() {
  const { proposalId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draftMsg = useServerFn(draftClientMessage);
  const generate = useServerFn(draftProposal);
  const consume = useConsumeQuota();
  const sendProposal = useServerFn(sendProposalNow);


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

  const { data: profile } = useQuery({ queryKey: ["proposal-profile"], queryFn: async () => {
    const { data, error } = await supabase.from("business_profiles").select("*").maybeSingle();
    if (error) throw error; return data;
  } });
  const { data: logo } = useLogoAsset(profile?.logo_url);
  const { data: credits } = useQuery({ queryKey: ["proposal-plan"], queryFn: async () => {
    const { data } = await supabase.from("user_credits").select("plan").maybeSingle(); return data;
  } });
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [brief, setBrief] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editReady, setEditReady] = useState(false);
  useEffect(() => { if (proposal && !editing) { setEditTitle(proposal.title); setEditContent(proposal.content ?? ""); setBrief(proposal.brief ?? ""); } }, [proposal, editing]);
  useEffect(() => { if (proposal) setEditReady(true); }, [proposal]);
  const autosave = useEditAutosave({ key: `proposal:${proposalId}`, ready: editReady,
    data: { title: editTitle, content: editContent, brief },
    apply: (d) => { setEditTitle(d.title); setEditContent(d.content); setBrief(d.brief); setEditing(true); },
  });
  const pdfBlob = useMemo(() => proposal && profile !== undefined ? generateProposalPdf({
    title: proposal.title, content: proposal.content ?? "", createdAt: proposal.created_at,
    clientName: proposal.clients?.name, businessName: profile?.business_name ?? undefined,
    businessAddress: [profile?.address_line1, profile?.address_line2, profile?.city, profile?.province, profile?.postal_code].filter(Boolean).join(", "),
    registrationNumber: profile?.registration_number, logoDataUrl: logo?.dataUrl,
    showBranding: !credits || credits.plan === "free",
  }) : null, [proposal, profile, logo, credits]);
  const filename = proposalFilename(proposal?.title ?? "document");
  const saveEdits = async () => {
    if (!editTitle.trim() || !editContent.trim()) return toast.error("Title and proposal content are required");
    setEditBusy(true);
    try { const { error } = await supabase.from("proposals").update({ title: editTitle.trim(), content: editContent, brief }).eq("id", proposalId);
      if (error) throw error; autosave.clear(); await qc.invalidateQueries({ queryKey: ["proposal", proposalId] }); setEditing(false); toast.success("Proposal saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); } finally { setEditBusy(false); }
  };
  const revise = async () => {
    if (brief.trim().length < 5) return toast.error("Add a project brief or revision instructions");
    if (!(await consume("ai_draft"))) return;
    setEditBusy(true);
    try { const out = await generate({ data: { brief, existingContent: editContent,
      businessName: profile?.business_name ?? undefined, clientName: proposal?.clients?.name,
      tone: profile?.brand_tone ?? undefined } }); setEditContent(out.content); toast.success("Draft ready for review");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Draft failed"); } finally { setEditBusy(false); }
  };

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
    setBody(`Please find attached our proposal, ${proposal?.title ?? ""}, for your review. Please let us know if you have any questions. We look forward to hearing from you.`);
    setOpen(true);
  };

  const aiCompose = async () => {
    if (!proposal) return;
    if (!(await consume("ai_draft"))) return;
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
        if (!pdfBlob) throw new Error("Please wait for the PDF preview to finish loading");
        const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const res = await sendProposal({ data: { proposalId, to: email, subject, bodyText: body,
          clientName: client?.name ?? null, pdfBase64: btoa(binary), pdfFilename: filename } });
        if (!res.ok) throw new Error("Email sending is unavailable until the sending address is verified. Your proposal has been kept.");
        toast.success(`Sent to ${res.to} with PDF attached`);

      } else {
        const phone = to.trim().replace(/[^\d+]/g, "").replace(/^\+/, "");
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
      if (channel === "whatsapp") toast.success("WhatsApp opened — review and send your message there");
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
          <Button variant="outline" onClick={() => setEditing(true)} disabled={editing}><Pencil className="size-4 mr-2" /> Edit</Button>
          <Button variant="outline" disabled={!pdfBlob || editing} onClick={() => { if (pdfBlob) downloadBlob(pdfBlob, filename); }}><Download className="size-4 mr-2" /> Download PDF</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={editing || !pdfBlob} onClick={() => openComposer("email")}>
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
                  {channel === "email" ? `Proposal: ${proposal.title} · PDF attached` : `Proposal: ${proposal.title}`}
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
          <TabsTrigger value="pdf">PDF preview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({comms?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          {editing ? <section className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="proposal-title">Title</Label><Input id="proposal-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="proposal-brief">Project brief / revision instructions</Label><Textarea id="proposal-brief" value={brief} onChange={(e) => setBrief(e.target.value)} /></div>
            <Button variant="outline" onClick={revise} disabled={editBusy}>{editBusy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}Draft with AI</Button>
            <div className="space-y-2"><Label htmlFor="proposal-content">Proposal content</Label><Textarea id="proposal-content" rows={24} value={editContent} onChange={(e) => setEditContent(e.target.value)} /></div>
            <div className="flex gap-2"><Button onClick={saveEdits} disabled={editBusy}><Save className="size-4 mr-2" />Save changes</Button><Button variant="outline" disabled={editBusy} onClick={() => { autosave.clear(); setEditing(false); }}>Cancel</Button></div>
          </section> : <article className="bg-document-page text-document-ink p-6 sm:p-10 break-words [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h3]:font-semibold [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-document-border [&_td]:p-2 [&_th]:p-2 [&_a]:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposal.content || ""}</ReactMarkdown>
          </article>}
        </TabsContent>
        <TabsContent value="pdf"><ProposalPdfPreview blob={pdfBlob} /></TabsContent>
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
