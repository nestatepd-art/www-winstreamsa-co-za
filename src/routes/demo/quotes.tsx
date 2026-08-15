import { createFileRoute } from "@tanstack/react-router";
import { DocWorkspace } from "@/components/demo/doc-workspace";

export const Route = createFileRoute("/demo/quotes")({
  head: () => ({
    meta: [
      { title: "Demo Quotes — WinStream SA" },
      {
        name: "description",
        content: "Build VAT-inclusive quotes with AI drafting in the free WinStream demo workspace.",
      },
      { property: "og:title", content: "Demo Quotes — WinStream SA" },
      {
        property: "og:description",
        content: "Try AI quote drafting with sample data, no signup required.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <DocWorkspace type="quote" />,
});
