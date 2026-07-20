import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListReviews,
  adminModerateReview,
  adminDeleteReview,
} from "@/lib/reviews-admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const listFn = useServerFn(adminListReviews);
  const moderateFn = useServerFn(adminModerateReview);
  const deleteFn = useServerFn(adminDeleteReview);
  const qc = useQueryClient();

  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["reviews", "admin"],
    queryFn: () => listFn(),
  });

  async function moderate(id: string, patch: { approved?: boolean; featured?: boolean }) {
    try {
      await moderateFn({ data: { id, ...patch } });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await deleteFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error)
    return (
      <div className="p-8 text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load reviews"}
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Reviews moderation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Approve reviews to publish them on /reviews. Featured reviews appear first.
      </p>

      {reviews && reviews.length === 0 ? (
        <div className="mt-10 rounded-2xl border p-8 text-center text-sm text-muted-foreground">
          No reviews yet.
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {reviews?.map((r: any) => (
            <li key={r.id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i <= r.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("en-ZA")}
                    </span>
                    {r.approved ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        Approved
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                        Pending
                      </span>
                    )}
                    {r.featured && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        Featured
                      </span>
                    )}
                  </div>
                  {r.title && <h3 className="mt-2 font-semibold">{r.title}</h3>}
                  <p className="mt-1 whitespace-pre-wrap text-sm">{r.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.display_name}
                    {r.business_name ? ` · ${r.business_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {r.approved ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moderate(r.id, { approved: false, featured: false })}
                    >
                      <X className="mr-1 h-4 w-4" /> Unpublish
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => moderate(r.id, { approved: true })}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  )}
                  {r.approved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moderate(r.id, { featured: !r.featured })}
                    >
                      <Star className="mr-1 h-4 w-4" />
                      {r.featured ? "Unfeature" : "Feature"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
