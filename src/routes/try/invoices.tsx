import { createFileRoute } from "@tanstack/react-router";
import { DocWorkspace } from "@/components/demo/doc-workspace";

export const Route = createFileRoute("/try/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — WinStream SA" },
      {
        name: "description",
        content: "See how WinStream tracks due, paid and overdue invoices in the free WinStream workspace.",
      },
      { property: "og:title", content: "Invoices — WinStream SA" },
      {
        property: "og:description",
        content: "Try invoicing and automated nudges with sample data, no signup required.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <DocWorkspace type="invoice" />,
});
