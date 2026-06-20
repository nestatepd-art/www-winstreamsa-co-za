import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/refund')({
  head: () => ({
    meta: [
      { title: 'Refund Policy — WinStream SA' },
      {
        name: 'description',
        content:
          '30-day money-back guarantee on WinStream SA subscriptions and credit packs, processed through Paddle.',
      },
      { property: 'og:title', content: 'Refund Policy — WinStream SA' },
      {
        property: 'og:description',
        content: '30-day money-back guarantee on WinStream SA, processed through Paddle.',
      },
      { property: 'og:url', content: 'https://winstreamsa.co.za/refund' },
    ],
    links: [{ rel: 'canonical', href: 'https://winstreamsa.co.za/refund' }],
  }),
  component: RefundPage,
})

function RefundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Refund Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 20 June 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">30-day money-back guarantee</h2>
        <p className="text-muted-foreground">
          WinStream SA, operated by Native Digital Media (Pty) Ltd (registration 2025/980214/07),
          offers a <strong>30-day money-back guarantee</strong> on all subscription plans and
          credit-pack purchases. If you are not satisfied, you can request a full refund within
          30 days of your order date.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">How to request a refund</h2>
        <p className="text-muted-foreground">
          Refunds are processed by our payment provider, <strong>Paddle</strong>, which is the
          Merchant of Record for all our orders. To request a refund:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>
            Visit{' '}
            <a className="underline" href="https://paddle.net" target="_blank" rel="noopener noreferrer">
              paddle.net
            </a>{' '}
            and look up your order using the email address you used to purchase, or
          </li>
          <li>
            Email us at{' '}
            <a className="underline" href="mailto:info@winstreamsa.co.za">info@winstreamsa.co.za</a>{' '}
            with your order number and we will help you raise the refund with Paddle.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">Subscription cancellations</h2>
        <p className="text-muted-foreground">
          You can cancel a subscription at any time. Cancellation takes effect immediately and
          your plan is downgraded to the free tier. Refund eligibility for the most recent
          billing period is subject to the 30-day guarantee above and to Paddle's{' '}
          <a className="underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">
            Refund Policy
          </a>
          .
        </p>
      </section>

      <div className="mt-12">
        <Link to="/" className="text-sm underline">← Back home</Link>
      </div>
    </main>
  )
}
