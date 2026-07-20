import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { listApprovedReviews } from "@/lib/reviews.functions";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_URL,
} from "@/lib/seo";

const URL = `${SITE_URL}/reviews`;

export const Route = createFileRoute("/reviews")({
  head: ({ loaderData }) => {
    const reviews = (loaderData as { reviews: Review[] } | undefined)?.reviews ?? [];
    const count = reviews.length;
    const avg =
      count > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : 0;

    const scripts = [];
    if (count > 0) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "WinStream SA",
          description:
            "AI-powered quoting, invoicing, and follow-up automation for South African small businesses.",
          brand: { "@type": "Brand", name: "WinStream SA" },
          url: SITE_URL,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avg,
            reviewCount: count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 20).map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Person", name: r.display_name },
            reviewBody: r.body,
            ...(r.title ? { name: r.title } : {}),
            datePublished: r.created_at,
          })),
        }),
      });
    }

    return {
      meta: [
        {
          title: `WinStream SA Reviews${count > 0 ? ` — ${avg}★ from ${count} SA businesses` : ""}`,
        },
        {
          name: "description",
          content:
            count > 0
              ? `Rated ${avg}/5 by ${count} South African businesses. Read verified reviews of WinStream SA's automation for quotes, invoices, and follow-ups.`
              : "Read verified customer reviews of WinStream SA — automation for quotes, invoices, and follow-ups built for South African small businesses.",
        },
        { property: "og:title", content: "WinStream SA — Customer Reviews" },
        {
          property: "og:description",
          content:
            "Real feedback from South African businesses using WinStream to automate their quoting and follow-ups.",
        },
        { property: "og:url", content: URL },
        { property: "og:image", content: DEFAULT_OG_IMAGE },
        { property: "og:image:width", content: String(DEFAULT_OG_IMAGE_WIDTH) },
        { property: "og:image:height", content: String(DEFAULT_OG_IMAGE_HEIGHT) },
        { property: "og:image:alt", content: DEFAULT_OG_IMAGE_ALT },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: DEFAULT_OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts,
    };
  },
  loader: async ({ context }) => {
    const reviews = await context.queryClient.ensureQueryData({
      queryKey: ["reviews", "approved"],
      queryFn: () => listApprovedReviews(),
    });
    return { reviews };
  },
  component: ReviewsPage,
});

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  display_name: string;
  business_name: string | null;
  featured: boolean;
  created_at: string;
};

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-white/20"}`}
        />
      ))}
    </div>
  );
}

function ReviewsPage() {
  const fn = useServerFn(listApprovedReviews);
  const { data: reviews } = useSuspenseQuery({
    queryKey: ["reviews", "approved"],
    queryFn: () => fn(),
  });

  const count = reviews.length;
  const avg =
    count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;

  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            What South African businesses say
          </h1>
          {count > 0 ? (
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5">
              <Stars n={Math.round(avg)} />
              <span className="text-lg font-semibold">{avg.toFixed(1)}</span>
              <span className="text-sm text-white/60">from {count} review{count === 1 ? "" : "s"}</span>
            </div>
          ) : (
            <p className="mt-4 text-white/60">
              Be the first to share your WinStream experience.
            </p>
          )}
          <div className="mt-6">
            <Link
              to="/_authenticated/settings/review" as="/settings/review"
              // fallback nav via signed-in area
              href="/settings/review"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#04121a] hover:bg-white/90"
            >
              Write a review
            </Link>
          </div>
        </div>

        {count > 0 && (
          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {reviews.map((r) => (
              <li
                key={r.id}
                className={`rounded-2xl border p-6 ${
                  r.featured
                    ? "border-amber-400/40 bg-amber-400/[0.04]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <Stars n={r.rating} />
                {r.title && (
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    {r.title}
                  </h3>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                  {r.body}
                </p>
                <p className="mt-4 text-xs text-white/50">
                  {r.display_name}
                  {r.business_name ? ` · ${r.business_name}` : ""} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("en-ZA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
