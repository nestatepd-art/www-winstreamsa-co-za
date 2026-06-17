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
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          AI Workflow Automation for South African Small Businesses
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          WinStream SA automates quotes, follow-ups, and business writing via WhatsApp and
          email — built for SA SMEs in ZAR, VAT-compliant and multilingual.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
