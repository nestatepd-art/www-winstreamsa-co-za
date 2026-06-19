import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/trust')({
  head: () => ({
    meta: [
      { title: 'Trust, Security & Privacy — Winstream SA' },
      {
        name: 'description',
        content:
          'How Winstream SA protects your data: security controls, privacy practices, and customer responsibilities.',
      },
      { property: 'og:title', content: 'Trust, Security & Privacy — Winstream SA' },
      {
        property: 'og:description',
        content:
          'Overview of the security, privacy, and operational controls used to protect customer data on Winstream SA.',
      },
      { property: 'og:url', content: 'https://winstreamsa.co.za/trust' },
    ],
    links: [{ rel: 'canonical', href: 'https://winstreamsa.co.za/trust' }],
  }),
  component: TrustPage,
})

function TrustPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Trust, Security & Privacy</h1>
      <p className="mt-4 text-muted-foreground">
        We take the security and privacy of your data seriously. This page explains the
        controls we apply and what you can expect from us. It is maintained by Winstream SA
        and is not an independent certification.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Authentication & Access</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Email/password and Google sign-in via a managed authentication provider.</li>
          <li>Sessions use signed tokens; passwords are never stored in plain text.</li>
          <li>Role-based access controls restrict privileged operations to authorized users.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Data Protection</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Data is encrypted in transit (TLS) and at rest by our managed database provider.</li>
          <li>Row-level security policies ensure users can only access their own records.</li>
          <li>Secrets and API keys are stored server-side and never exposed to the browser.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Privacy</h2>
        <p className="text-muted-foreground">
          We collect only the information needed to provide the service: account details,
          content you create (quotes, proposals, clients), and basic usage information. We do
          not sell personal data. You may request export or deletion of your account data at
          any time by contacting us.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Operational Practices</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Regular automated security scans of application code and dependencies.</li>
          <li>Principle of least privilege for server-side database functions.</li>
          <li>Incident response: notification of affected users for material security events.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Your Responsibilities</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Use a strong, unique password and keep your account credentials private.</li>
          <li>Report suspected security issues to us promptly.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="text-muted-foreground">
          Security or privacy questions? Email{' '}
          <a className="underline" href="mailto:info@winstreamsa.co.za">
            info@winstreamsa.co.za
          </a>
          .
        </p>
      </section>

      <div className="mt-12">
        <Link to="/" className="text-sm underline">
          ← Back home
        </Link>
      </div>
    </main>
  )
}
