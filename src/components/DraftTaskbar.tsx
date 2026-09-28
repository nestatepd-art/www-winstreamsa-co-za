import { FileText, Receipt, ScrollText, X, Minus } from "lucide-react";
import { removeTrayDraft, useResumeDraft, useTrayDrafts, type TrayKind } from "@/lib/draft-tray";
import { Button } from "@/components/ui/button";

const ICON: Record<TrayKind, typeof FileText> = { quote: FileText, invoice: Receipt, proposal: ScrollText };
const LABEL: Record<TrayKind, string> = { quote: "Quote", invoice: "Invoice", proposal: "Proposal" };

export function DraftTaskbar() {
  const drafts = useTrayDrafts();
  const resume = useResumeDraft();
  if (!drafts.length) return null;
  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur px-3 py-2 flex items-center gap-2 overflow-x-auto">
      <span className="text-xs text-muted-foreground shrink-0 pr-1">Paused drafts</span>
      {drafts.map((d) => {
        const Icon = ICON[d.kind];
        return (
          <div key={d.id} className="flex items-center shrink-0 rounded-md border border-border bg-background">
            <button
              onClick={() => resume(d)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-l-md max-w-[220px]"
              title={`Resume ${LABEL[d.kind].toLowerCase()}`}
            >
              <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">{LABEL[d.kind]}</span>
              <span className="truncate">{d.title}</span>
            </button>
            <button
              onClick={() => {
                if (confirm("Discard this paused draft?")) removeTrayDraft(d.id);
              }}
              className="px-2 py-1.5 hover:bg-muted rounded-r-md text-muted-foreground"
              aria-label="Discard draft"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function MinimizeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} title="Park this on the taskbar and finish later">
      <Minus className="h-4 w-4 mr-1" /> Save to taskbar
    </Button>
  );
}
