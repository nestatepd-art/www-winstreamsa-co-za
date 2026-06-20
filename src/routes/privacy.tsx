import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Notice — WinStream SA' },
      {
        name: 'description',
        content:
          'How Native Digital Media (Pty) Ltd, operator of WinStream SA, collects, uses, shares and protects your personal information.',
      },
      { property: 'og:title', content: 'Privacy Notice — WinStream SA' },
      {
        property: 'og:description',
        content: 'How WinStream SA handles your personal information.',
      },
      { property: 'og:url', content: 'https://winstreamsa.co.za/privacy' },
    ],
    links: [{ rel: 'canonical', href: 'https://winstreamsa.co.za/privacy' }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Privacy Notice</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 20 June 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">1. Who we are</h2>
        <p className="text-muted-foreground">
          WinStream SA is operated by <strong>Native Digital Media (Pty) Ltd</strong>, a company
          registered in South Africa under registration number <strong>2025/980214/07</strong>
          {' '}("we", "us"). We act as the <strong>data controller</strong> (or "responsible
          party" under POPIA) for the personal information processed through the Service.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">2. Information we collect</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li><strong>Account details:</strong> name, email address, login credentials, and authentication identifiers from Google sign-in.</li>
          <li><strong>Content you create:</strong> quotes, proposals, client records, chat prompts and AI outputs you generate in the Service.</li>
          <li><strong>Contact and support data:</strong> messages you send to us and metadata of those communications.</li>
          <li><strong>Usage and telemetry:</strong> pages viewed, features used, AI credit usage, timestamps, and error logs.</li>
          <li><strong>Device data:</strong> IP address, browser type, device identifiers, and approximate location derived from IP.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">3. Why we use it (purposes and legal basis)</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>To create and manage your account and deliver the Service — <em>performance of a contract</em>.</li>
          <li>To process payments and manage subscriptions through Paddle — <em>performance of a contract</em>.</li>
          <li>To secure the Service, prevent fraud, and enforce our Terms — <em>legitimate interests</em>.</li>
          <li>To improve and develop new features (using aggregated or de-identified data where possible) — <em>legitimate interests</em>.</li>
          <li>To provide customer support — <em>performance of a contract / legitimate interests</em>.</li>
          <li>To send service-related and marketing communications — <em>legitimate interests / consent</em>, with an opt-out in every marketing email.</li>
          <li>To comply with legal, accounting and tax obligations — <em>legal obligation</em>.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">4. Who we share it with</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li><strong>Paddle</strong> — our Merchant of Record for payments, subscription management, invoicing and tax compliance.</li>
          <li><strong>Hosting and infrastructure providers</strong> — to operate the application, database, storage, and email delivery.</li>
          <li><strong>AI model providers</strong> — to process your prompts and return AI outputs. We do not knowingly send sensitive personal data to AI providers.</li>
          <li><strong>Analytics providers</strong> (e.g. Google Analytics) — to understand aggregate Service usage.</li>
          <li><strong>Professional advisers</strong> — legal, accounting, and similar advisers where reasonably required.</li>
          <li><strong>Authorities</strong> — where required by law or to protect rights, property or safety.</li>
        </ul>
        <p className="text-muted-foreground">We do not sell your personal information.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">5. International transfers</h2>
        <p className="text-muted-foreground">
          Some of our service providers (including Paddle, our hosting platform and AI model
          providers) are located outside South Africa, including in the EU, UK and USA. Where
          personal information is transferred internationally we rely on appropriate safeguards
          such as the recipient being in a country with adequate data-protection laws, the
          provider's binding contractual commitments, or Standard Contractual Clauses.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">6. Retention</h2>
        <p className="text-muted-foreground">
          We keep personal information for as long as your account is active and for a
          reasonable period afterwards to meet legal, accounting and dispute-resolution
          requirements. When data is no longer needed it is deleted or anonymised. You may ask
          us to delete your account at any time (see your rights below).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">7. Security</h2>
        <p className="text-muted-foreground">
          We apply appropriate technical and organisational measures to protect your data,
          including TLS encryption in transit, encryption at rest by our managed database
          provider, role-based access controls, and row-level security policies. No system is
          perfectly secure, and you also have a role to play by keeping your credentials safe.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">8. Your rights</h2>
        <p className="text-muted-foreground">
          Subject to applicable law (including POPIA in South Africa and the GDPR/UK GDPR where
          relevant), you have the right to:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Access the personal information we hold about you;</li>
          <li>Request correction of inaccurate data, or deletion of data we no longer need;</li>
          <li>Object to or restrict certain processing, and withdraw consent at any time;</li>
          <li>Request a portable copy of data you provided to us;</li>
          <li>Lodge a complaint with the South African Information Regulator (or, in the EU/UK, your local supervisory authority).</li>
        </ul>
        <p className="text-muted-foreground">
          To exercise these rights, email{' '}
          <a className="underline" href="mailto:info@winstreamsa.co.za">info@winstreamsa.co.za</a>.
          We aim to respond within one month.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">9. Cookies</h2>
        <p className="text-muted-foreground">
          We use a small number of cookies and similar technologies: <strong>essential</strong>
          {' '}cookies to keep you signed in and the Service working, and <strong>analytics</strong>
          {' '}cookies (Google Analytics) to understand aggregate usage. You can manage cookies
          through your browser settings.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">10. Changes to this notice</h2>
        <p className="text-muted-foreground">
          We may update this Privacy Notice from time to time. We will post the updated version
          on this page and update the "Last updated" date above.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">11. Contact</h2>
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
