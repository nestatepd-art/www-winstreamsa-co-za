import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Bell, MessageCircle, ArrowRight } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
} from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WinStream SA — AI Workflow Automation for South African Small Businesses" },
      {
        name: "description",
        content:
          "AI-powered workflow automation for South African SMEs. Automate quotes, follow-ups, and business writing via WhatsApp and email.",
      },
      {
        property: "og:title",
        content: "WinStream SA — AI Automation for SA Businesses",
      },
      {
        property: "og:description",
        content:
          "Automate quotes, follow-ups & writing in 10 minutes. Built for South African SMEs.",
      },
      { property: "og:url", content: "https://winstreamsa.co.za/" },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { property: "og:image:width", content: String(DEFAULT_OG_IMAGE_WIDTH) },
      { property: "og:image:height", content: String(DEFAULT_OG_IMAGE_HEIGHT) },
      { property: "og:image:alt", content: DEFAULT_OG_IMAGE_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://winstreamsa.co.za/" }],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LandingPage,
});

const TEAL = "oklch(0.78 0.13 195)";
const INDIGO = "oklch(0.62 0.18 270)";
const NAVY = "oklch(0.18 0.06 264)";
const DEEP = "oklch(0.10 0.04 264)";

function LandingPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{ background: DEEP }}
    >
      <SiteNav />
      {/* Ambient glow orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[20%] -left-[15%] -z-10 h-[60vmin] w-[60vmin] rounded-full opacity-60 blur-3xl animate-blob"
        style={{ background: `${TEAL.replace(")", " / 0.18)")}` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] -right-[15%] -z-10 h-[65vmin] w-[65vmin] rounded-full opacity-70 blur-3xl animate-blob-delay"
        style={{ background: `${INDIGO.replace(")", " / 0.22)")}` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[10%] left-[15%] -z-10 h-[50vmin] w-[50vmin] rounded-full opacity-50 blur-3xl"
        style={{ background: `${NAVY.replace(")", " / 0.55)")}` }}
      />

      {/* Drifting grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-ws-grid opacity-40" />

      {/* Top fade for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64"
        style={{ background: "linear-gradient(to bottom, oklch(0 0 0 / 0.5), transparent)" }}
      />

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center sm:py-28">
        {/* Eyebrow badge */}
        <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: TEAL, boxShadow: `0 0 10px ${TEAL}` }}
          />
          Built for South African SMEs
        </span>

        {/* Hero headline */}
        <h1 className="mt-8 max-w-4xl animate-fade-in text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          <span className="block text-white">AI Workflow Automation</span>
          <span
            className="mt-2 block bg-clip-text text-transparent animate-gradient-x"
            style={{
              backgroundImage: `linear-gradient(90deg, ${TEAL}, ${INDIGO}, ${TEAL})`,
            }}
          >
            for South African Small Businesses
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-in text-base leading-relaxed text-white/65 sm:text-lg [animation-delay:120ms]">
          WinStream SA automates quotes, follow-ups, and business writing via WhatsApp and
          email — built for SA SMEs in ZAR, VAT-compliant and multilingual.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex w-full max-w-md animate-fade-in flex-col gap-3 sm:flex-row sm:justify-center [animation-delay:240ms]">
          <Link
            to="/auth"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-sm font-bold text-[#04121a] transition-transform duration-200 hover:scale-[1.02] active:scale-95"
            style={{
              background: TEAL,
              boxShadow: `0 0 32px -4px ${TEAL.replace(")", " / 0.55)")}`,
            }}
          >
            <span>Get started free</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10 active:scale-95"
          >
            Sign in
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid w-full animate-fade-in gap-4 sm:grid-cols-3 [animation-delay:360ms]">
          {[
            {
              t: "Smart Quotes",
              d: "Generate VAT-compliant quotes in seconds.",
              Icon: Zap,
              tint: TEAL,
            },
            {
              t: "Auto Follow-ups",
              d: "Never chase a payment or proposal again.",
              Icon: Bell,
              tint: INDIGO,
            },
            {
              t: "WhatsApp + Email",
              d: "Meet clients where they already are.",
              Icon: MessageCircle,
              tint: TEAL,
            },
          ].map(({ t, d, Icon, tint }) => (
            <div
              key={t}
              className="group relative rounded-2xl p-[1px] transition-transform duration-300 hover:-translate-y-1"
              style={{
                background:
                  "linear-gradient(160deg, oklch(1 0 0 / 0.22), oklch(1 0 0 / 0.04) 40%, transparent)",
              }}
            >
              <div
                className="relative h-full rounded-[15px] p-6 text-left backdrop-blur-xl transition-colors"
                style={{ background: "oklch(0.16 0.05 264 / 0.75)" }}
              >
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10"
                  style={{
                    background: tint.replace(")", " / 0.12)"),
                    color: tint,
                    boxShadow: `inset 0 0 0 1px ${tint.replace(")", " / 0.25)")}`,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust footer */}
        <div className="mt-16 flex animate-fade-in items-center gap-3 [animation-delay:480ms]">
          <span className="h-px w-12 bg-white/15" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
            ZAR · VAT-compliant · POPIA-ready
          </span>
          <span className="h-px w-12 bg-white/15" />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
