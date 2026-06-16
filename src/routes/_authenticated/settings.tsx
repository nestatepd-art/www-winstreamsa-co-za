import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const LANGS = [
  { value: "en", label: "English" },
  { value: "af", label: "Afrikaans" },
  { value: "zu", label: "isiZulu" },
  { value: "xh", label: "isiXhosa" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (profile?.id) {
        const { error } = await supabase.from("business_profiles").update(form).eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_profiles").insert({ ...form, user_id: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["business-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Business settings</h1>
        <p className="text-muted-foreground text-sm mt-1">These details appear on your quotes and invoices.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Business profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <F label="Business name" required><Input value={form.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} /></F>
          <F label="Trading as"><Input value={form.trading_name ?? ""} onChange={(e) => set("trading_name", e.target.value)} /></F>
          <F label="VAT number"><Input value={form.vat_number ?? ""} onChange={(e) => set("vat_number", e.target.value)} /></F>
          <F label="Company registration"><Input value={form.registration_number ?? ""} onChange={(e) => set("registration_number", e.target.value)} /></F>
          <F label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></F>
          <F label="Phone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></F>
          <F label="Website" className="sm:col-span-2"><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></F>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
          <CardDescription>Shown on the quote header.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <F label="Address line 1" className="sm:col-span-2"><Input value={form.address_line1 ?? ""} onChange={(e) => set("address_line1", e.target.value)} /></F>
          <F label="Address line 2" className="sm:col-span-2"><Input value={form.address_line2 ?? ""} onChange={(e) => set("address_line2", e.target.value)} /></F>
          <F label="City"><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></F>
          <F label="Province"><Input value={form.province ?? ""} onChange={(e) => set("province", e.target.value)} /></F>
          <F label="Postal code"><Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} /></F>
          <F label="Country"><Input value={form.country ?? "South Africa"} onChange={(e) => set("country", e.target.value)} /></F>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Banking details</CardTitle>
          <CardDescription>Printed at the bottom of every quote and invoice.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <F label="Account holder"><Input value={form.bank_account_holder ?? ""} onChange={(e) => set("bank_account_holder", e.target.value)} /></F>
          <F label="Bank"><Input value={form.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value)} /></F>
          <F label="Account number"><Input value={form.bank_account_number ?? ""} onChange={(e) => set("bank_account_number", e.target.value)} /></F>
          <F label="Branch code"><Input value={form.bank_branch_code ?? ""} onChange={(e) => set("bank_branch_code", e.target.value)} /></F>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Defaults & brand voice</CardTitle>
          <CardDescription>How VukaFlow writes for you.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <F label="Default language">
            <Select value={form.default_language ?? "en"} onValueChange={(v) => set("default_language", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANGS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Quote validity (days)">
            <Input type="number" min={1} value={form.default_quote_validity_days ?? 30} onChange={(e) => set("default_quote_validity_days", parseInt(e.target.value) || 30)} />
          </F>
          <F label="Brand tone (used by AI)" className="sm:col-span-2">
            <Input placeholder="e.g. friendly but professional, no jargon" value={form.brand_tone ?? ""} onChange={(e) => set("brand_tone", e.target.value)} />
          </F>
          <F label="Default quote terms" className="sm:col-span-2">
            <Textarea rows={3} placeholder="e.g. 50% deposit required to start; balance due on completion." value={form.default_quote_terms ?? ""} onChange={(e) => set("default_quote_terms", e.target.value)} />
          </F>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-0 bg-background/80 backdrop-blur py-4 -mx-6 px-6 border-t border-border">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function F({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}{required && " *"}</Label>
      {children}
    </div>
  );
}
