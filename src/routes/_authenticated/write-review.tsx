import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyReview,
  upsertMyReview,
  deleteMyReview,
} from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/write-review")({
  component: WriteReview,
});

function WriteReview() {
  const fetchMine = useServerFn(getMyReview);
  const submit = useServerFn(upsertMyReview);
  const remove = useServerFn(deleteMyReview);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: existing, isLoading } = useQuery({
    queryKey: ["reviews", "mine"],
    queryFn: () => fetchMine(),
  });

  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setTitle(existing.title ?? "");
      setBody(existing.body);
      setDisplayName(existing.display_name);
      setBusinessName(existing.business_name ?? "");
    } else {
      supabase.auth.getUser().then(({ data }) => {
        const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
        if (!displayName && meta) {
          setDisplayName(
            (meta.full_name as string) ||
              (meta.name as string) ||
              data.user?.email?.split("@")[0] ||
              "",
          );
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 10) {
      toast.error("Please write at least 10 characters.");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Please add a display name.");
      return;
    }
    setSaving(true);
    try {
      await submit({
        data: {
          rating,
          title: title.trim() || null,
          body: body.trim(),
          display_name: displayName.trim(),
          business_name: businessName.trim() || null,
        },
      });
      track("review_submitted", { rating });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(
        existing
          ? "Review updated — it'll re-appear once approved."
          : "Thanks! Your review is pending approval.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save review.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete your review? This cannot be undone.")) return;
    try {
      await remove();
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review deleted.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete review.";
      toast.error(msg);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const displayedRating = hover || rating;
  const statusBadge = existing?.approved
    ? { label: "Published", cls: "bg-emerald-500/15 text-emerald-500" }
    : existing
      ? { label: "Pending approval", cls: "bg-amber-500/15 text-amber-600" }
      : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {existing ? "Edit your review" : "Share your experience"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your rating helps other South African businesses discover WinStream — and
          helps us improve the features you use most. Approved reviews appear on{" "}
          <Link to="/reviews" className="underline">the public reviews page</Link>.
        </p>
        {statusBadge && (
          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge.cls}`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-card p-6">
        <div>
          <Label className="mb-2 block">Your rating</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${i} stars`}
                className="rounded p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    i <= displayedRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="title">Headline (optional)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Saved us hours every week"
            maxLength={120}
          />
        </div>

        <div>
          <Label htmlFor="body">Your review</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's working well? What would you like us to build next?"
            rows={6}
            maxLength={2000}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {body.length}/2000 characters
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div>
            <Label htmlFor="biz">Business (optional)</Label>
            <Input
              id="biz"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Plumbing"
              maxLength={120}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : existing ? "Update review" : "Submit review"}
          </Button>
          {existing && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
