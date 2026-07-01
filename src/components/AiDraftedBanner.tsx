import { Sparkles } from "lucide-react";

/**
 * Reminder shown after AI generates client-facing content.
 * Reinforces WinStream's "AI-drafted, human-approved" model.
 */
export function AiDraftedBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground/80 ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
      <span>
        <strong className="font-medium text-foreground">AI drafted — please review.</strong>{" "}
        Check the wording, numbers and dates before you send this to a client.
      </span>
    </div>
  );
}
