import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms & Conditions — WinStream SA' },
      {
        name: 'description',
        content:
          'Terms & Conditions for using WinStream SA, operated by Native Digital Media (Pty) Ltd.',
      },
      { property: 'og:title', content: 'Terms & Conditions — WinStream SA' },
      {
        property: 'og:description',
        content: 'The terms that govern your use of WinStream SA.',
      },
      { property: 'og:url', content: 'https://www.winstreamsa.co.za/terms' },
    ],
    links: [{ rel: 'canonical', href: 'https://www.winstreamsa.co.za/terms' }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-invert">
      <h1 className="text-4xl font-bold tracking-tight">Terms & Conditions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 20 June 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">1. Who we are</h2>
        <p className="text-muted-foreground">
          WinStream SA (the "Service") is operated by <strong>Native Digital Media (Pty) Ltd</strong>,
          a company registered in South Africa under registration number{' '}
          <strong>2025/980214/07</strong> ("we", "us", "our"). By using the Service you are
          contracting with Native Digital Media (Pty) Ltd.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">2. Acceptance of these terms</h2>
        <p className="text-muted-foreground">
          By creating an account or continuing to use the Service you agree to these Terms. If
          you are using the Service on behalf of an organisation, you confirm that you have
          authority to bind that organisation. If you are an individual, you confirm you are of
          legal age in your jurisdiction.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">3. The service</h2>
        <p className="text-muted-foreground">
          WinStream SA provides AI-assisted workflow automation for small businesses, including
          quote and proposal generation, follow-ups, and business writing delivered through web,
          email, and WhatsApp channels. Features available to you depend on your selected plan.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">4. Accounts and accuracy</h2>
        <p className="text-muted-foreground">
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity under your account. You must provide accurate registration
          information and keep it up to date.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">5. Acceptable use</h2>
        <p className="text-muted-foreground">You must not use the Service to:</p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Break any law or infringe anyone's rights, including intellectual property rights;</li>
          <li>Send spam, conduct fraud, or harass others;</li>
          <li>Upload malware or attempt to probe, scan, or interfere with the Service or its security;</li>
          <li>Scrape, reverse engineer, resell, or redistribute the Service or its outputs except as expressly permitted;</li>
          <li>Generate illegal content, deepfakes, hate speech, sexual content involving minors, or content designed to deceive or defraud;</li>
          <li>Attempt to jailbreak the AI features or use them to produce malware or attack tooling.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">6. AI-generated content</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>
            You are responsible for the prompts you provide, for how you use any AI outputs, for
            verifying their accuracy, and for ensuring you have the rights to any content you
            input.
          </li>
          <li>
            Subject to your compliance with these Terms, you own the outputs you generate via the
            Service for your own lawful business use. We may use de-identified usage data to
            improve the Service.
          </li>
          <li>
            AI outputs may be inaccurate, incomplete, or biased. The Service is not a substitute
            for professional legal, financial, tax, or medical advice and must not be relied on
            for regulated decisions without qualified human oversight.
          </li>
          <li>
            We may moderate, filter, or refuse outputs, and may remove content or suspend
            accounts that violate these Terms. Rights-holders may contact{' '}
            <a className="underline" href="mailto:info@winstreamsa.co.za">info@winstreamsa.co.za</a>{' '}
            to report infringing content; repeat infringers will lose access.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">7. Intellectual property</h2>
        <p className="text-muted-foreground">
          We retain ownership of the Service and all related intellectual property, including
          software, models, prompts, documentation, and branding. You receive a limited,
          non-exclusive, non-transferable right to use the Service within the limits of your
          plan. You grant us a limited licence to host and process your content solely to
          provide and improve the Service.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">8. Payments, billing and Paddle</h2>
        <p className="text-muted-foreground">
          Our order process is conducted by our online reseller{' '}
          <a className="underline" href="https://www.paddle.com" target="_blank" rel="noopener noreferrer">
            Paddle.com
          </a>
          . Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer
          service enquiries and handles returns. Payment, billing, taxes, subscription renewals,
          cancellations and refunds are governed by Paddle's{' '}
          <a className="underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">
            Buyer Terms
          </a>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">9. Service availability</h2>
        <p className="text-muted-foreground">
          We work hard to keep the Service reliable, but we do not guarantee that it will be
          uninterrupted, error-free, or available at any specific level of performance.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">10. Suspension and termination</h2>
        <p className="text-muted-foreground">
          We may suspend or terminate your access for material breach of these Terms,
          non-payment, security or fraud risk, or repeated or serious policy violations. On
          termination your right to use the Service ends. We will make reasonable efforts to let
          you export your data for 30 days after termination, after which we may delete it.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">11. Warranties and liability</h2>
        <p className="text-muted-foreground">
          To the fullest extent permitted by law, the Service is provided "as is" without
          warranties of any kind, whether express or implied, including merchantability, fitness
          for a particular purpose, and non-infringement. Our aggregate liability for any claim
          arising out of or relating to the Service is limited to the fees you paid us in the 12
          months preceding the claim. We are not liable for indirect, consequential, special,
          incidental, or punitive damages, including loss of profits, revenue, data, or
          goodwill. Nothing in these Terms excludes liability that cannot be excluded by law,
          including for fraud, death, or personal injury caused by negligence.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">12. Indemnity</h2>
        <p className="text-muted-foreground">
          You will indemnify us against claims arising from your content, your unlawful use of
          the Service, or your breach of these Terms.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">13. Governing law</h2>
        <p className="text-muted-foreground">
          These Terms are governed by the laws of the Republic of South Africa, and the courts
          of South Africa have exclusive jurisdiction over any disputes.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">14. Assignment and force majeure</h2>
        <p className="text-muted-foreground">
          You may not assign these Terms without our consent. We may assign them in connection
          with a merger, acquisition, or sale of assets. Neither party is liable for delays or
          failures caused by events beyond reasonable control.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">15. Contact</h2>
        <p className="text-muted-foreground">
          Native Digital Media (Pty) Ltd · Registration 2025/980214/07 · South Africa ·{' '}
          <a className="underline" href="mailto:info@winstreamsa.co.za">info@winstreamsa.co.za</a>
        </p>
      </section>

      <div className="mt-12">
        <Link to="/" className="text-sm underline">← Back home</Link>
      </div>
    </main>
  )
}
