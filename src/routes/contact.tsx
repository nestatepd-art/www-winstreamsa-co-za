import { createFileRoute } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { Mail, MapPin, Clock } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { openEmailDraft } from "@/lib/email-compose";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact WinStream SA — Support & Sales for SA Businesses" },
      {
        name: "description",
        content:
          "Get in touch with WinStream SA. Email support, sales enquiries, and partnership requests answered within one business day.",
      },
      { property: "og:title", content: "Contact WinStream SA" },
      {
        property: "og:description",
        content: "Reach our team — based in South Africa, replies within 1 business day.",
      },
      { property: "og:url", content: "https://winstreamsa.co.za/contact" },
    ],
    links: [{ rel: "canonical", href: "https://winstreamsa.co.za/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact WinStream SA",
          url: "https://winstreamsa.co.za/contact",
          mainEntity: {
            "@type": "Organization",
            name: "WinStream SA",
            url: "https://winstreamsa.co.za",
            email: "info@winstreamsa.co.za",
            areaServed: "ZA",
            contactPoint: {
              "@type": "ContactPoint",
              email: "info@winstreamsa.co.za",
              contactType: "customer support",
              areaServed: "ZA",
              availableLanguage: ["English", "Afrikaans", "Zulu"],
            },
          },
        }),
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    openEmailDraft({
      to: "info@winstreamsa.co.za",
      subject: `WinStream SA enquiry${name ? ` from ${name}` : ""}`,
      body: [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    });
  };

  return (
    <div className="min-h-screen bg-[#04121a] text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Get in touch
        </h1>
        <p className="mt-4 text-white/70">
          Questions, sales enquiries, or partnership ideas — we typically reply within
          one business day.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:info@winstreamsa.co.za"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.08]"
          >
            <Mail className="h-5 w-5 text-teal-300" />
            <h2 className="mt-3 font-semibold">Email</h2>
            <p className="mt-1 text-sm text-white/70">info@winstreamsa.co.za</p>
          </a>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <Clock className="h-5 w-5 text-teal-300" />
            <h2 className="mt-3 font-semibold">Hours</h2>
            <p className="mt-1 text-sm text-white/70">Mon – Fri, 08:00 – 17:00 SAST</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:col-span-2">
            <MapPin className="h-5 w-5 text-teal-300" />
            <h2 className="mt-3 font-semibold">Based in South Africa</h2>
            <p className="mt-1 text-sm text-white/70">
              Remote team across SA, supporting customers nationwide.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleContactSubmit}
          className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
        >
          <h2 className="text-lg font-bold">Send a message</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-white/70">Name</span>
              <input
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 focus:border-teal-400 focus:outline-none"
                placeholder="Your name"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/70">Email</span>
              <input
                type="email"
                name="email"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 focus:border-teal-400 focus:outline-none"
                placeholder="you@example.co.za"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-white/70">Message</span>
            <textarea
              name="message"
              required
              rows={5}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-white placeholder:text-white/30 focus:border-teal-400 focus:outline-none"
              placeholder="How can we help?"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-bold text-[#04121a] hover:bg-teal-300"
          >
            Send message
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
