import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2, Send, Download, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addDoc,
  bumpAiUsage,
  clientName,
  DEMO_AI_LIMIT,
  docTotals,
  money,
  removeDoc,
  updateDoc,
  useDemoState,
  uid,
  type DemoDoc,
  type DemoDocType,
  type DemoLineItem,
} from "@/lib/demo-store";
import { draftDemoDocument } from "@/lib/demo-ai.functions";

const LABEL: Record<DemoDocType, { one: string; many: string; blurb: string }> = {
  quote: {
    one: "Quote",
    many: "Quotes",
    blurb: "VAT-inclusive quotes with auto numbering and follow-up nudges.",
  },
  invoice: {
    one: "Invoice",
    many: "Invoices",
    blurb: "Track what's due, what's paid and what needs a nudge.",
  },
  proposal: {
    one: "Proposal",
    many: "Proposals",
    blurb: "Longer-form scopes of work you can send in seconds.",
  },
};

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/15 text-primary",
  accepted: "bg-emerald-500/15 text-emerald-600",
  paid: "bg-emerald-500/15 text-emerald-600",
  overdue: "bg-destructive/15 text-destructive",
};

const blank = (): DemoLineItem => ({ id: uid(), description: "", qty: 1, unitPrice: 0 });

export function DocWorkspace({ type }: { type: DemoDocType }) {
  const state = useDemoState();
  const label = LABEL[type];
  const docs = state.docs.filter((d) => d.type === type);
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{label.many}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{label.blurb}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> New {label.one.toLowerCase()}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New {label.one.toLowerCase()}</DialogTitle>
            </DialogHeader>
            <DocForm type={type} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        {docs.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No {label.many.toLowerCase()} yet — create one to see how it works.
            </CardContent>
          </Card>
        )}
        {docs.map((doc) => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}

function DocCard({ doc }: { doc: DemoDoc }) {
  const state = useDemoState();
  const { subtotal, vat, total } = docTotals(doc);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">
            {doc.number} — {doc.title || "Untitled"}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientName(state, doc.clientId)} · due {doc.dueDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusTone[doc.status] ?? statusTone.draft} variant="secondary">
            {doc.status}
          </Badge>
          <span className="text-sm font-semibold">{money(total)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Hide details" : "View details"}
        </button>

        {expanded && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <ul className="space-y-1.5">
              {doc.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {i.qty} × {i.description}
                  </span>
                  <span className="shrink-0">{money(i.qty * i.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-right text-xs">
              <div>Subtotal {money(subtotal)}</div>
              <div>VAT (15%) {money(vat)}</div>
              <div className="text-sm font-semibold">Total {money(total)}</div>
            </div>
            {doc.notes && <p className="mt-3 text-xs text-muted-foreground">{doc.notes}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              updateDoc(doc.id, { status: doc.type === "invoice" ? "paid" : "sent" });
              toast.success("Sending is live on real accounts", {
                description: "In the demo we just mark the document as sent.",
              });
            }}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast.info("PDF export is available after signup", {
                description: "Real accounts download a branded PDF with your logo and banking details.",
              })
            }
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          {doc.type === "quote" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                addDoc({
                  type: "invoice",
                  clientId: doc.clientId,
                  title: doc.title,
                  items: doc.items.map((i) => ({ ...i, id: uid() })),
                  notes: doc.notes,
                  status: "draft",
                  createdAt: new Date().toISOString().slice(0, 10),
                  dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
                  vatInclusive: doc.vatInclusive,
                  autoNudge: true,
                });
                toast.success("Converted to an invoice");
              }}
            >
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> To invoice
            </Button>
          )}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Auto-nudge
            <Switch
              checked={doc.autoNudge}
              onCheckedChange={(v) => updateDoc(doc.id, { autoNudge: v })}
            />
          </label>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              removeDoc(doc.id);
              toast.success("Deleted");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocForm({ type, onDone }: { type: DemoDocType; onDone: () => void }) {
  const state = useDemoState();
  const [clientId, setClientId] = useState(state.clients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<DemoLineItem[]>([blank()]);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
  );
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);

  const aiLeft = Math.max(0, DEMO_AI_LIMIT - state.aiUsed);

  const runAi = async () => {
    if (brief.trim().length < 4) {
      toast.error("Describe the job in a few words first");
      return;
    }
    if (aiLeft <= 0) {
      toast.error("Demo AI limit reached — sign up free to keep drafting");
      return;
    }
    setDrafting(true);
    try {
      const draft = await draftDemoDocument({
        data: { brief, clientName: state.clients.find((c) => c.id === clientId)?.name },
      });
      setTitle(draft.title);
      setItems(draft.items.map((i) => ({ ...i, id: uid() })));
      setNotes(draft.notes);
      bumpAiUsage();
      toast.success("Draft generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate a draft");
    } finally {
      setDrafting(false);
    }
  };

  const save = () => {
    if (!clientId) {
      toast.error("Add a client first");
      return;
    }
    const clean = items.filter((i) => i.description.trim());
    if (!clean.length) {
      toast.error("Add at least one line item");
      return;
    }
    addDoc({
      type,
      clientId,
      title: title || "Untitled",
      items: clean,
      notes,
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
      dueDate,
      vatInclusive: true,
      autoNudge: true,
    });
    toast.success(`${LABEL[type].one} created`);
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
        <Label className="flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Draft with AI · {aiLeft} left in demo
        </Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. Replace 150L geyser and repipe hot water line in Claremont"
          />
          <Button onClick={runAi} disabled={drafting || aiLeft <= 0} className="shrink-0">
            {drafting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            Generate
          </Button>
        </div>
        {aiLeft <= 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Demo limit reached.{" "}
            <Link to="/auth" className="font-medium text-primary hover:underline">
              Sign up free
            </Link>{" "}
            to keep generating.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Client</Label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {state.clients.length === 0 && <option value="">No clients yet</option>}
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Due / valid until</Label>
          <Input
            type="date"
            className="mt-1"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Title</Label>
        <Input
          className="mt-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Geyser replacement — Unit 4"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Line items</Label>
        <div className="hidden gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
          <span className="flex-1">Description</span>
          <span className="w-16 text-center">Qty</span>
          <span className="w-28 text-right">Unit price (R)</span>
          <span className="w-24 text-right">Line total</span>
          <span className="w-9" />
        </div>
        {items.map((item, idx) => (
          <div key={item.id} className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
            <div className="min-w-[10rem] flex-1">
              <Label className="mb-1 block text-[11px] text-muted-foreground sm:hidden">
                Description
              </Label>
              <Input
                value={item.description}
                placeholder="e.g. Supply and install 150L geyser"
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((i, n) => (n === idx ? { ...i, description: e.target.value } : i)),
                  )
                }
              />
            </div>
            <div className="w-16">
              <Label className="mb-1 block text-[11px] text-muted-foreground sm:hidden">Qty</Label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="1"
                value={item.qty}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((i, n) => (n === idx ? { ...i, qty: Number(e.target.value) } : i)),
                  )
                }
              />
            </div>
            <div className="w-28">
              <Label className="mb-1 block text-[11px] text-muted-foreground sm:hidden">
                Unit price (R)
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={item.unitPrice}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((i, n) => (n === idx ? { ...i, unitPrice: Number(e.target.value) } : i)),
                  )
                }
              />
            </div>
            <div className="w-24 pb-2 text-right text-sm tabular-nums text-muted-foreground">
              {money(item.qty * item.unitPrice)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove line item"
              onClick={() => setItems((prev) => prev.filter((_, n) => n !== idx))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, blank()])}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add line
        </Button>
      </div>

      <div>
        <Label className="text-xs">Notes / terms</Label>
        <Textarea
          className="mt-1"
          rows={3}
          value={notes}
          placeholder="e.g. Valid for 14 days. 50% deposit on acceptance. Prices VAT inclusive at 15%."
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
        <div className="text-right text-xs text-muted-foreground">
          {(() => {
            const gross = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
            const sub = gross / (1 + VAT_RATE);
            return (
              <div className="space-y-0.5 text-left">
                <div>Subtotal {money(sub)}</div>
                <div>VAT (15%) {money(gross - sub)}</div>
                <div className="text-sm font-semibold text-foreground">Total {money(gross)}</div>
              </div>
            );
          })()}
        </div>
        <Button onClick={save}>Save {LABEL[type].one.toLowerCase()}</Button>
      </div>
    </div>
  );
}
