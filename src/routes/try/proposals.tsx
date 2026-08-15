import { createFileRoute } from "@tanstack/react-router";
import { DocWorkspace } from "@/components/demo/doc-workspace";

export const Route = createFileRoute("/try/proposals")({
  head: () => ({
    meta: [
      { title: "Proposals — WinStream SA" },
      {
        name: "description",
        content: "Draft detailed client proposals in seconds inside the free WinStream workspace.",
      },
      { property: "og:title", content: "Proposals — WinStream SA" },
      {
        property: "og:description",
        content: "Try AI proposal drafting with sample data, no signup required.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <DocWorkspace type="proposal" />,
});
