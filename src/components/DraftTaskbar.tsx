import { FileText, Receipt, ScrollText, X, Minus, Layers } from "lucide-react";
import { removeTrayDraft, useResumeDraft, useTrayDrafts, type TrayKind } from "@/lib/draft-tray";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ICON: Record<TrayKind, typeof FileText> = { quote: FileText, invoice: Receipt, proposal: ScrollText };
const LABEL: Record<TrayKind, string> = { quote: "Quote", invoice: "Invoice", proposal: "Proposal" };

/** Paused drafts menu — lives top-right in the workspace header. */
export function DraftTaskbar() {
  const drafts = useTrayDrafts();
  const resume = useResumeDraft();
  if (!drafts.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto shrink-0 gap-2" aria-label="Paused drafts">
          <Layers className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Paused drafts</span>
          <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5 min-w-5 text-center">
            {drafts.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Click a draft to reopen it</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {drafts.map((d) => {
          const Icon = ICON[d.kind];
          return (
            <DropdownMenuItem key={d.id} onSelect={() => resume(d)} className="gap-2 cursor-pointer">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{LABEL[d.kind]}</div>
                <div className="truncate text-sm">{d.title}</div>
              </div>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm("Discard this paused draft?")) removeTrayDraft(d.id);
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
                aria-label="Discard draft"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MinimizeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} title="Park this on the taskbar and finish later">
      <Minus className="h-4 w-4 mr-1" /> Save to taskbar
    </Button>
  );
}
