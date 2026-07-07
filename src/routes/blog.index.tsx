import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { listPublishedPosts } from "@/lib/blog.functions";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
} from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — WinStream SA | Automation tips for SA Small Businesses" },
      {
        name: "description",
        content:
          "Practical guides on quoting, follow-ups, VAT, WhatsApp marketing, and growing a South African small business with automation.",
      },
      { property: "og:title", content: "WinStream SA Blog" },
      {
        property: "og:description",
        content: "Automation, sales, and ops tips for South African small businesses.",
      },
      { property: "og:url", content: "https://www.winstreamsa.co.za/blog" },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { property: "og:image:width", content: String(DEFAULT_OG_IMAGE_WIDTH) },
      { property: "og:image:height", content: String(DEFAULT_OG_IMAGE_HEIGHT) },
      { property: "og:image:alt", content: DEFAULT_OG_IMAGE_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://www.winstreamsa.co.za/blog" }],
  }),
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["blog", "published"],
      queryFn: () => listPublishedPosts(),
    }),
  component: BlogIndex,
});

function BlogIndex() {
  const fn = useServerFn(listPublishedPosts);
  const { data: posts } = useSuspenseQuery({
    queryKey: ["blog", "published"],
    queryFn: () => fn(),
  });

  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-4 text-white/70">
          Tips, playbooks, and product updates for South African small businesses.
        </p>

        {posts.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            New posts coming soon — check back in a few days.
          </div>
        ) : (
          <ul className="mt-10 space-y-6">
            {posts.map((p) => (
              <li
                key={p.slug}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.06]"
              >
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="block">
                  {p.cover_image_url && (
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      className="mb-4 aspect-[16/8] w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                  )}
                  <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
                  <p className="mt-2 text-sm text-white/70">{p.excerpt}</p>
                  <p className="mt-3 text-xs text-white/40">
                    {p.author_name} ·{" "}
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString("en-ZA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
