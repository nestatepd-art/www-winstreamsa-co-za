import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — WinStream SA | Plans for SA Small Businesses" },
      {
        name: "description",
        content:
          "Simple, transparent pricing in ZAR. Start free, upgrade when you grow. VAT-compliant invoicing built for South African SMEs.",
      },
      { property: "og:title", content: "WinStream SA Pricing — Plans in ZAR" },
      {
        property: "og:description",
        content: "Transparent ZAR pricing for SA small businesses. Start free.",
      },
      { property: "og:url", content: "https://winstreamsa.co.za/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://winstreamsa.co.za/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "WinStream SA",
          description: "AI workflow automation for South African SMEs",
          brand: { "@type": "Brand", name: "WinStream SA" },
          offers: [
            { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "ZAR" },
            { "@type": "Offer", name: "Growth", price: "499", priceCurrency: "ZAR" },
            { "@type": "Offer", name: "Scale", price: "1499", priceCurrency: "ZAR" },
          ],
        }),
      },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Starter",
    price: "R0",
    period: "forever",
    description: "Try the core automations risk-free.",
    features: ["10 AI credits / month", "Quotes & proposals", "1 user", "Email support"],
    cta: "Get started free",
  },
  {
    name: "Growth",
    price: "R499",
    period: "per month",
    description: "For active SMEs sending weekly quotes.",
    features: [
      "500 AI credits / month",
      "WhatsApp + email follow-ups",
      "3 users",
      "Priority support",
      "VAT-compliant PDF export",
    ],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Scale",
    price: "R1,499",
    period: "per month",
    description: "Built for growing teams with custom workflows.",
    features: [
      "2,000 AI credits / month",
      "Unlimited users",
      "Custom branding",
      "Dedicated onboarding",
      "API access",
    ],
    cta: "Contact sales",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Simple pricing in ZAR
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Pay only for what you need. Cancel anytime. All prices exclude VAT.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${
                p.featured
                  ? "border-teal-400/40 bg-white/[0.07] shadow-2xl shadow-teal-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {p.featured && (
                <span className="mb-3 inline-block rounded-full bg-teal-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="mt-1 text-sm text-white/60">{p.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="text-sm text-white/50">/ {p.period}</span>
              </div>
              <Link
                to="/auth"
                className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
                  p.featured
                    ? "bg-teal-400 text-[#04121a] hover:bg-teal-300"
                    : "border border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                {p.cta}
              </Link>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-white/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-white/50">
          Need a custom plan? <Link to="/contact" className="underline">Get in touch</Link>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
