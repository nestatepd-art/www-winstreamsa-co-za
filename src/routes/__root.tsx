import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { installStaleServerFunctionReloadGuard } from "../lib/stale-server-function-reload";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { initAnalytics, identifyUser, resetAnalytics } from "@/lib/analytics";

installStaleServerFunctionReloadGuard();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WinStream SA — AI Automation for SA Businesses" },
      {
        name: "description",
        content:
          "AI-powered workflow automation for South African SMEs. Automate quotes, follow-ups, and business writing via WhatsApp and email.",
      },
      { property: "og:site_name", content: "WinStream SA" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_ZA" },
      { property: "og:title", content: "WinStream SA — AI Automation for SA Businesses" },
      {
        property: "og:description",
        content:
          "Automate quotes, follow-ups & writing in 10 minutes. Built for South African SMEs.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "WinStream SA — AI Automation for SA Businesses" },
      {
        name: "twitter:description",
        content:
          "Automate quotes, follow-ups & writing in 10 minutes. Built for South African SMEs.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Non-blocking font load: fetched as a preload then swapped to a stylesheet
      // by the inline script below. System font fallback renders immediately.
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        id: "ws-inter-font",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        media: "print",
      },
    ],
    scripts: [
      {
        type: "text/javascript",
        async: true,
        src: "https://www.googletagmanager.com/gtag/js?id=G-YN6M1Z7HZ1",
      },
      {
        type: "text/javascript",
        children: `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-YN6M1Z7HZ1');`,
      },
      {
        children: `(function(){var l=document.getElementById('ws-inter-font');if(l){l.addEventListener('load',function(){l.rel='stylesheet';l.media='all';});}var ls=document.querySelectorAll('link[rel="stylesheet"][media="print"]');ls.forEach(function(x){x.media='all';});})();`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "WinStream SA",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "AI-powered workflow automation for South African SMEs. Automates quotes, follow-ups, and business writing via WhatsApp and email.",
          offers: {
            "@type": "Offer",
            price: "6500",
            priceCurrency: "ZAR",
            priceSpecification: "per month",
          },
          areaServed: "ZA",
          url: "https://winstreamsa.co.za",
        }),
      },
    ],


  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event === "SIGNED_OUT") return;
      queryClient.invalidateQueries();

      if (event === "SIGNED_IN" && session?.user) {
        try {
          // Ensure a business profile exists (Google sign-ups skip the signup form).
          const { data: existing } = await supabase
            .from("business_profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (!existing) {
            await supabase.from("business_profiles").insert({
              user_id: session.user.id,
              business_name: session.user.user_metadata?.full_name || "My Business",
            });
          }
          // Claim any pending purchases made before this account existed.
          const { claimPendingPurchases } = await import("@/lib/portal.functions");
          await claimPendingPurchases().catch(() => {});
        } catch (err) {
          console.warn("post-signin hook failed:", err);
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
