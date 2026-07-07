import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About WinStream SA — Built in South Africa for SA Businesses" },
      {
        name: "description",
        content:
          "WinStream SA is an automation platform built in South Africa to help local SMEs spend less time on admin and more time on customers.",
      },
      { property: "og:title", content: "About WinStream SA" },
      {
        property: "og:description",
        content: "Built in South Africa for SA small businesses — our story and mission.",
      },
      { property: "og:url", content: "https://www.winstreamsa.co.za/about" },
    ],
    links: [{ rel: "canonical", href: "https://www.winstreamsa.co.za/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About WinStream SA",
          url: "https://www.winstreamsa.co.za/about",
          mainEntity: {
            "@type": "Organization",
            name: "WinStream SA",
            url: "https://www.winstreamsa.co.za",
            areaServed: "ZA",
          },
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Built for South African business
        </h1>
        <p className="mt-6 text-lg text-white/75">
          WinStream SA exists because running an SA small business shouldn't mean
          drowning in admin. Quoting in Excel, chasing payments on WhatsApp,
          rewriting the same proposal — it's a tax on your time.
        </p>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-bold">Our mission</h2>
          <p className="text-white/70">
            Give every South African SME the same automation leverage that big
            companies have — priced in Rands, compliant with SARS and POPIA, and
            simple enough to set up in an afternoon.
          </p>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-bold">Local-first</h2>
          <p className="text-white/70">
            We're based in South Africa. We build for ZAR, VAT, EFT and WhatsApp
            because that's how SA businesses actually work. Support is in your
            timezone, in plain English (or Afrikaans, or Zulu).
          </p>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-bold">What's next</h2>
          <p className="text-white/70">
            We're rolling out deeper accounting integrations, more languages, and
            industry-specific templates throughout 2026. Want a feature? {" "}
            <Link to="/contact" className="underline">Tell us</Link>.
          </p>
        </section>

        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <p className="text-sm text-white/70">Ready to try it?</p>
          <Link
            to="/auth"
            className="mt-3 inline-block rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-bold text-[#04121a] hover:bg-teal-300"
          >
            Get started free
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
