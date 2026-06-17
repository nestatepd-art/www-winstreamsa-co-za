import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { draftProposal } from "@/lib/proposals.functions";
import { useConsumeQuota } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proposals/new")({
  component: NewProposal,
});

function NewProposal() {
  const navigate = useNavigate();
  const generate = useServerFn(draftProposal);
  const consume = useConsumeQuota();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [brief, setBrief] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState<"ai" | "save" | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });
  const { data: profile } = useQuery({
    queryKey: ["profile-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_profiles")
        .select("business_name, brand_tone")
        .maybeSingle();
      return data;
    },
  });

  const handleDraft = async () => {
    if (brief.trim().length < 5) return toast.error("Tell me a bit about the project first.");
    if (!(await consume("ai_draft"))) return;
    setBusy("ai");
    try {
      const clientName = clients?.find((c) => c.id === clientId)?.name;
      const { content: out } = await generate({
        data: {
          businessName: profile?.business_name ?? undefined,
          clientName,
          brief,
          tone: profile?.brand_tone ?? undefined,
        },
      });
      setContent(out);
      // Auto-fill title from first H1 if empty
      if (!title) {
        const m = out.match(/^#\s+(.+)$/m);
        if (m) setTitle(m[1].trim());
      }
      toast.success("Draft ready — review and edit before sending");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI draft failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Add a title");
    if (!content.trim()) return toast.error("Generate or write a proposal first");
    if (!(await consume("proposal"))) return;
    setBusy("save");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        user_id: u.user.id,
        title,
        brief,
        content,
        client_id: clientId || null,
        status: "draft",
      })
      .select("id")
      .single();
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Proposal saved");
    navigate({ to: "/proposals/$proposalId", params: { proposalId: data.id } });
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">New proposal</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe the work in a few lines — AI drafts the full proposal in your tone.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brief</CardTitle>
          <CardDescription>What's the project? Who's it for? Any must-haves?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select a client (optional)" /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website redesign for Acme" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Project brief</Label>
            <Textarea
              rows={5}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g. New 6-page Shopify site for a Cape Town coffee roastery. Needs online ordering, loyalty points, and a wholesale enquiry form. Launch in 6 weeks."
            />
          </div>
          <div>
            <Button onClick={handleDraft} disabled={busy === "ai"} variant="default">
              {busy === "ai" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Draft with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proposal content</CardTitle>
          <CardDescription>Markdown — edit anything before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="font-mono text-sm"
            placeholder="# Proposal title…"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate({ to: "/proposals" })}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy === "save"}>
              {busy === "save" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save proposal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
