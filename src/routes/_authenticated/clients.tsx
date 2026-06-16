import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./dashboard";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", city: "", notes: "" });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("clients").insert({ ...form, user_id: u.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client added");
      setOpen(false);
      setForm({ name: "", contact_person: "", email: "", phone: "", city: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">Your contact book — leads and customers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a client</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <Field label="Business / client name *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Contact person">
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              </div>
              <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending}>Save client</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Add your first client — you'll be able to send quotes and invoices to them in seconds."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add client</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Card key={c.id} className="group">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-start justify-between gap-2">
                  <span className="truncate">{c.name}</span>
                  <button
                    onClick={() => confirm(`Delete ${c.name}?`) && deleteMut.mutate(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    aria-label="Delete client"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardTitle>
                {c.contact_person && <CardDescription>{c.contact_person}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {c.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.phone}</div>}
                {c.city && <div className="flex items-center gap-2"><Users className="h-3 w-3" />{c.city}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
