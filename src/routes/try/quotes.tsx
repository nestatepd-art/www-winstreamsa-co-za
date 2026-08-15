import { createFileRoute } from "@tanstack/react-router";
import { DocWorkspace } from "@/components/demo/doc-workspace";

export const Route = createFileRoute("/try/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes — WinStream SA" },
      {
        name: "description",
        content: "Build VAT-inclusive quotes with AI drafting in the free WinStream workspace.",
      },
      { property: "og:title", content: "Quotes — WinStream SA" },
      {
        property: "og:description",
        content: "Try AI quote drafting with sample data, no signup required.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <DocWorkspace type="quote" />,
});
