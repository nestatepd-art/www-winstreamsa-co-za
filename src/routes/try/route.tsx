import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DemoSidebar } from "@/components/demo/demo-sidebar";

export const Route = createFileRoute("/try")({
  ssr: false,
  component: DemoLayout,
});

function DemoLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DemoSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            <span>
              Free workspace — sample data stays in your browser. Create an account to save your work.
            </span>
            <Link
              to="/auth"
              className="rounded-md bg-background/95 px-3 py-1 font-semibold text-foreground hover:bg-background"
            >
              Create free account
            </Link>
          </div>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold tracking-tight text-foreground">WinStream</span>
              <span>·</span>
              <span>Try before you sign up</span>
            </div>
          </header>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
