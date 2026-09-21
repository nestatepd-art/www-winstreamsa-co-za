import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { isOnboardingAllowedPath, useOnboardingStatus } from "@/hooks/use-onboarding";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // The session store can be asynchronous (brokered between preview surfaces),
    // so a freshly signed-in user can briefly read back as "no session". Retry a
    // few times before bouncing, otherwise a successful sign-in looks like a
    // rejected one.
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return { user: data.session.user };
      await new Promise((r) => setTimeout(r, 250));
    }

    // Still nothing locally — confirm with the server before bouncing to /auth.
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
    const result = await Promise.race([supabase.auth.getUser(), timeout]);
    if (result && !result.error && result.data.user) return { user: result.data.user };

    throw redirect({ to: "/auth" });
  },


  component: AuthedLayout,
});

function OnboardingGate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: status } = useOnboardingStatus();

  useEffect(() => {
    if (!status || status.complete) return;
    if (isOnboardingAllowedPath(pathname)) return;
    toast.info("Finish the setup steps first", {
      description: "Complete your business profile and add a client to unlock the workspace.",
    });
    navigate({ to: "/dashboard", replace: true });
  }, [status, pathname, navigate]);

  return null;
}

function AuthedLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-card/60 backdrop-blur px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tracking-tight">WinStream</span>
              <span>·</span>
              <span>Work that runs itself</span>
            </div>
          </header>
          <main className="flex-1 min-w-0">
            <OnboardingGate />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
