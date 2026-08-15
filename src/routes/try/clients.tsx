import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addClient, removeClient, updateClient, useDemoState } from "@/lib/demo-store";

export const Route = createFileRoute("/try/clients")({
  head: () => ({
    meta: [
      { title: "Clients — WinStream SA" },
      {
        name: "description",
        content: "Add, edit and manage your clients in the free WinStream workspace.",
      },
      { property: "og:title", content: "Clients — WinStream SA" },
      {
        property: "og:description",
        content: "Manage a client book in WinStream, no signup required.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TryClients,
});

const FIELDS = [
  ["name", "Business name"],
  ["contact", "Contact person"],
  ["email", "Email"],
  ["phone", "Phone"],
] as const;

const EMPTY = { name: "", contact: "", email: "", phone: "" };

function TryClients() {
  const state = useDemoState();
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    addClient(form);
    setForm(EMPTY);
    toast.success("Client added");
  };

  const saveEdit = () => {
    if (!editId) return;
    if (!editForm.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    updateClient(editId, editForm);
    setEditId(null);
    toast.success("Client updated");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your client book. Here it lives in this browser until you create an account.
      </p>

      <Card className="mt-6">
        <CardContent className="space-y-3 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <Button onClick={submit}>
            <Plus className="mr-1.5 h-4 w-4" /> Add client
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-2">
        {state.clients.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {[c.contact, c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                aria-label="Edit client"
                onClick={() => {
                  setEditId(c.id);
                  setEditForm({
                    name: c.name ?? "",
                    contact: c.contact ?? "",
                    email: c.email ?? "",
                    phone: c.phone ?? "",
                  });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                aria-label="Delete client"
                onClick={() => {
                  removeClient(c.id);
                  toast.success("Client removed");
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1"
                  value={editForm[key]}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
