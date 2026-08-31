import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/clients/new")({
  head: () => ({
    meta: [
      { title: "Add a Client — WinStream SA" },
      { name: "description", content: "Add a client to your WinStream SA workspace." },
      { property: "og:title", content: "Add a Client — WinStream SA" },
      { property: "og:description", content: "Add a client to your WinStream SA workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewClientPage,
});

function NewClientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", address_line1: "", contact_person: "", email: "", phone: "", city: "", notes: "" });

  const createClient = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      const { error } = await supabase.from("clients").insert({ ...form, user_id: data.user.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Client added");
      import("@/lib/analytics").then(({ track }) => track("client_added"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["onboarding-status"] }),
      ]);
      try { sessionStorage.removeItem("ws-setup"); } catch {}
      navigate({ to: "/dashboard" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <header>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })} className="mb-3 -ml-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Add your first client</h1>
        <p className="text-muted-foreground text-sm mt-1">Save their details once, then select them on quotes and invoices.</p>
      </header>

      <Card className="border-primary/25">
        <CardHeader>
          <CardTitle className="text-lg">Client details</CardTitle>
          <CardDescription>Only the client name is required.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Business / client name *" className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => update("name", event.target.value)} autoFocus />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address_line1} onChange={(event) => update("address_line1", event.target.value)} placeholder="Street address" />
          </Field>
          <Field label="Contact person"><Input value={form.contact_person} onChange={(event) => update("contact_person", event.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
          <Field label="City"><Input value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button onClick={() => createClient.mutate()} disabled={!form.name.trim() || createClient.isPending}>
              {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save client"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}