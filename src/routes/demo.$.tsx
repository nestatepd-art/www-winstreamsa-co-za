import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy sub-paths — redirect into the /try workspace. */
export const Route = createFileRoute("/demo/$")({
  beforeLoad: () => {
    throw redirect({ to: "/try" });
  },
  component: () => null,
});
