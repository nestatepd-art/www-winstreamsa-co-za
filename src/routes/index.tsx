import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VukaFlow — Work automation for SA businesses" },
      {
        name: "description",
        content:
          "Automate quoting, writing and follow-ups. Built for South African SMEs — ZAR, VAT-compliant, multilingual.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
