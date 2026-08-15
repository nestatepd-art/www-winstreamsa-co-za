import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSignature,
  Receipt,
  Settings,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import winstreamLogo from "@/assets/winstream-logo.png.asset.json";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { DEMO_AI_LIMIT, resetDemo, useDemoState } from "@/lib/demo-store";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const items: NavItem[] = [
  { title: "Dashboard", url: "/demo", icon: LayoutDashboard, exact: true },
  { title: "Clients", url: "/demo/clients", icon: Users },
  { title: "Quotes", url: "/demo/quotes", icon: FileText },
  { title: "Invoices", url: "/demo/invoices", icon: Receipt },
  { title: "Proposals", url: "/demo/proposals", icon: FileSignature },
  { title: "Settings", url: "/demo/settings", icon: Settings },
];

export function DemoSidebar() {
  const { state: sidebarState, setOpenMobile } = useSidebar();
  const collapsed = sidebarState === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const demo = useDemoState();
  const remaining = Math.max(0, DEMO_AI_LIMIT - demo.aiUsed);

  const isActive = (url: string, exact?: boolean) =>
    exact ? currentPath === url : currentPath === url || currentPath.startsWith(url + "/");

  const handleNavClick = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={winstreamLogo.url} alt="WinStream" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">WinStream</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Demo workspace
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Try it out</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                    <Link to={item.url as "/demo"} onClick={handleNavClick} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {remaining} AI draft{remaining === 1 ? "" : "s"} left
            </div>
            <p className="mt-1 text-muted-foreground">Sign up free for more.</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                resetDemo();
                toast.success("Demo data reset");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {!collapsed && <span>Reset demo</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
