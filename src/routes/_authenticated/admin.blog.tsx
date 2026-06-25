import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_image_url: string | null;
  author_name: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/blog")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw redirect({ to: "/dashboard" });
  },
  component: AdminBlog,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const empty: Omit<Post, "id" | "updated_at"> = {
  slug: "",
  title: "",
  excerpt: "",
  content_md: "",
  cover_image_url: DEFAULT_OG_IMAGE,
  author_name: "WinStream SA",
  published: false,
  published_at: null,
};

function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setPosts((data ?? []) as Post[]);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title || !editing.slug || !editing.excerpt) {
      toast.error("Title, slug, and excerpt are required");
      return;
    }
    setSaving(true);
    const payload = {
      slug: editing.slug,
      title: editing.title,
      excerpt: editing.excerpt,
      content_md: editing.content_md ?? "",
      cover_image_url: editing.cover_image_url || DEFAULT_OG_IMAGE,
      author_name: editing.author_name || "WinStream SA",
      published: !!editing.published,
      published_at: editing.published
        ? (editing.published_at ?? new Date().toISOString())
        : null,
    };
    const { error } = editing.id
      ? await supabase.from("blog_posts").update(payload).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editing.id ? "Updated" : "Created");
      setEditing(null);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Admin</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and publish blog posts.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New post
        </button>
      </div>

      {editing && (
        <div className="mb-8 space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">
            {editing.id ? "Edit post" : "New post"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Title</span>
              <input
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing((s) => ({
                    ...s!,
                    title: e.target.value,
                    slug: s?.id ? s.slug : slugify(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Slug (URL)</span>
              <input
                value={editing.slug ?? ""}
                onChange={(e) =>
                  setEditing((s) => ({ ...s!, slug: slugify(e.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Excerpt (shown in lists & social cards, ≤160 chars)</span>
            <textarea
              value={editing.excerpt ?? ""}
              maxLength={200}
              rows={2}
              onChange={(e) => setEditing((s) => ({ ...s!, excerpt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
              <span className="font-medium">Cover image URL</span>
            <input
              value={editing.cover_image_url ?? ""}
              onChange={(e) =>
                setEditing((s) => ({ ...s!, cover_image_url: e.target.value }))
              }
                placeholder={DEFAULT_OG_IMAGE}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
              <span className="mt-1 block text-xs text-muted-foreground">
                Leave this as the branded WinStream image unless you have a custom blog cover.
              </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Content (markdown / plain text)</span>
            <textarea
              value={editing.content_md ?? ""}
              rows={16}
              onChange={(e) =>
                setEditing((s) => ({ ...s!, content_md: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!editing.published}
              onChange={(e) =>
                setEditing((s) => ({ ...s!, published: e.target.checked }))
              }
            />
            <span>Published (visible at /blog)</span>
          </label>
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border">
        {posts.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No posts yet. Click "New post" to create your first one.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{p.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        p.published
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.published ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">/blog/{p.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.published && (
                    <Link
                      to="/blog/$slug"
                      params={{ slug: p.slug }}
                      className="text-xs underline"
                    >
                      View
                    </Link>
                  )}
                  <button
                    onClick={() => setEditing(p)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="rounded-lg border border-destructive/30 px-2 py-1.5 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
