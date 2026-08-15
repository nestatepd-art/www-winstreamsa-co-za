import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

/** Legacy path — the sandbox workspace now lives at /try. */
export const Route = createFileRoute("/demo")({
  beforeLoad: () => {
    throw redirect({ to: "/try" });
  },
  component: () => <Outlet />,
});
