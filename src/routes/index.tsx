import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
      { property: "og:url", content: "https://biz-buddy-za.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://biz-buddy-za.lovable.app/" }],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient brand background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 10%, oklch(0.78 0.13 195 / 0.22) 0%, transparent 60%), radial-gradient(55% 45% at 90% 20%, oklch(0.55 0.16 240 / 0.20) 0%, transparent 60%), radial-gradient(70% 60% at 50% 100%, oklch(0.26 0.10 264 / 0.15) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 -z-10 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl animate-blob"
        style={{ background: "oklch(0.78 0.13 195 / 0.35)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 -z-10 h-[32rem] w-[32rem] rounded-full opacity-50 blur-3xl animate-blob-delay"
        style={{ background: "oklch(0.55 0.16 240 / 0.35)" }}
      />

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Built for South African SMEs
        </span>

        <h1
          className="mt-6 animate-fade-in bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl"
          style={{
            backgroundImage:
              "linear-gradient(135deg, oklch(0.22 0.10 264) 0%, oklch(0.55 0.16 240) 55%, oklch(0.78 0.13 195) 100%)",
          }}
        >
          AI Workflow Automation for South African Small Businesses
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-in text-lg text-muted-foreground [animation-delay:120ms]">
          WinStream SA automates quotes, follow-ups, and business writing via WhatsApp and
          email — built for SA SMEs in ZAR, VAT-compliant and multilingual.
        </p>

        <div className="mt-10 flex animate-fade-in justify-center gap-3 [animation-delay:240ms]">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:scale-[1.03]"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            Get started free
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background/70 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-accent/15"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid animate-fade-in gap-4 sm:grid-cols-3 [animation-delay:360ms]">
          {[
            { t: "Smart Quotes", d: "Generate VAT-compliant quotes in seconds." },
            { t: "Auto Follow-ups", d: "Never chase a payment or proposal again." },
            { t: "WhatsApp + Email", d: "Meet clients where they already are." },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-xl border border-border/60 bg-card/70 p-5 text-left shadow-[var(--shadow-card)] backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                <span className="h-2 w-2 rounded-full bg-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
