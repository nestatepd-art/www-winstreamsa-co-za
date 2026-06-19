import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { getPostBySlug } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    try {
      return await context.queryClient.ensureQueryData({
        queryKey: ["blog", "post", params.slug],
        queryFn: () => getPostBySlug({ data: { slug: params.slug } }),
      });
    } catch {
      throw notFound();
    }
  },
  head: ({ params, loaderData }) => {
    const post = loaderData;
    if (!post) {
      return { meta: [{ title: "Post not found — WinStream SA" }] };
    }
    const url = `https://winstreamsa.co.za/blog/${params.slug}`;
    return {
      meta: [
        { title: `${post.title} — WinStream SA Blog` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(post.cover_image_url
          ? [
              { property: "og:image", content: post.cover_image_url },
              { name: "twitter:image", content: post.cover_image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            author: { "@type": "Organization", name: post.author_name },
            datePublished: post.published_at,
            image: post.cover_image_url || undefined,
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  component: BlogPost,
  notFoundComponent: () => (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold">Post not found</h1>
        <p className="mt-4 text-white/70">This article may have been removed.</p>
        <Link to="/blog" className="mt-6 inline-block underline">
          ← Back to blog
        </Link>
      </main>
      <SiteFooter />
    </div>
  ),
});

function BlogPost() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getPostBySlug);
  const { data: post } = useSuspenseQuery({
    queryKey: ["blog", "post", slug],
    queryFn: () => fn({ data: { slug } }),
  });

  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/blog" className="text-sm text-white/60 hover:text-white">
          ← Back to blog
        </Link>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-white/50">
          {post.author_name} ·{" "}
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : ""}
        </p>
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="mt-8 aspect-[16/8] w-full rounded-2xl object-cover"
          />
        )}
        <p className="mt-8 text-lg text-white/80">{post.excerpt}</p>
        <article
          className="prose prose-invert prose-headings:font-bold prose-a:text-teal-300 mt-8 max-w-none whitespace-pre-wrap text-white/85"
        >
          {post.content_md}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
