import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { addClient, removeClient, useDemoState } from "@/lib/demo-store";

export const Route = createFileRoute("/try/clients")({
  head: () => ({
    meta: [
      { title: "Demo Clients — WinStream SA" },
      {
        name: "description",
        content: "Add and manage sample clients in the free WinStream demo workspace.",
      },
      { property: "og:title", content: "Demo Clients — WinStream SA" },
      {
        property: "og:description",
        content: "Manage a client book in the WinStream sandbox, no signup required.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoClients,
});

function DemoClients() {
  const state = useDemoState();
  const [form, setForm] = useState({ name: "", contact: "", email: "", phone: "" });

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    addClient(form);
    setForm({ name: "", contact: "", email: "", phone: "" });
    toast.success("Client added");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your client book. In the demo it lives in this browser only.
      </p>

      <Card className="mt-6">
        <CardContent className="space-y-3 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["name", "Business name"],
                ["contact", "Contact person"],
                ["email", "Email"],
                ["phone", "Phone"],
              ] as const
            ).map(([key, label]) => (
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
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                removeClient(c.id);
                toast.success("Client removed");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
