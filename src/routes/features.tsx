import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileSignature,
  MessageCircle,
  Bell,
  Users,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Quotes, Proposals & Follow-ups | WinStream SA" },
      {
        name: "description",
        content:
          "AI quoting, proposal automation, WhatsApp & email follow-ups, client CRM, and VAT-compliant billing — purpose-built for South African SMEs.",
      },
      { property: "og:title", content: "WinStream SA Features" },
      {
        property: "og:description",
        content: "Everything an SA small business needs to quote, follow up, and get paid.",
      },
      { property: "og:url", content: "https://www.winstreamsa.co.za/features" },
    ],
    links: [{ rel: "canonical", href: "https://www.winstreamsa.co.za/features" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: [
            "AI Quotes",
            "AI Proposals",
            "WhatsApp Follow-ups",
            "Client CRM",
            "VAT Billing",
            "Multi-language",
          ].map((name, i) => ({ "@type": "ListItem", position: i + 1, name })),
        }),
      },
    ],
  }),
  component: FeaturesPage,
});

const features = [
  {
    icon: FileSignature,
    title: "AI Quotes & Proposals",
    body: "Generate ZAR-priced, VAT-compliant quotes and polished proposals in seconds. Edit, export to PDF, and send.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & Email",
    body: "Send quotes and follow-ups through the channels your clients actually read. WhatsApp Business and email built in.",
  },
  {
    icon: Bell,
    title: "Automated Follow-ups",
    body: "Stop chasing manually. Set rules and let WinStream nudge prospects until they reply or convert.",
  },
  {
    icon: Users,
    title: "Client CRM",
    body: "A focused contact book scoped to your business — track communications, quotes, and outstanding invoices per client.",
  },
  {
    icon: CreditCard,
    title: "VAT-compliant Billing",
    body: "ZAR, VAT, and SARS-ready outputs. Bank details, terms, and validity baked into every document.",
  },
  {
    icon: Sparkles,
    title: "Multilingual & Local",
    body: "Built in South Africa. English, Afrikaans and Zulu prompts. POPIA-aware data handling.",
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Everything you need to run the back office
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            WinStream SA replaces 6 tools with one focused workspace built for South
            African small businesses.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.06]"
            >
              <Icon className="h-6 w-6 text-teal-300" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-bold text-[#04121a] hover:bg-teal-300"
          >
            Start free — no card required
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
