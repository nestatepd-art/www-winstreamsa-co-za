/**
 * Plain-language notes for the latest change, emailed by the monitor when a
 * new version goes live. Replace the list with each user-visible change.
 */
export const RELEASE_NOTES: { change: string; userImpact: string }[] = [
  {
    change: "Email sending now checks the client's address can receive mail before and right after sending.",
    userImpact:
      "Quotes, invoices, proposals, follow-ups and recurring invoices no longer show 'sent' when the client's mailbox rejects the email. Users see a clear message to correct the address instead of silent non-delivery.",
  },
  {
    change: "Recurring invoices count issued invoices separately from emails actually delivered.",
    userImpact: "The Recurring page no longer says 'sent' for invoices whose email was blocked.",
  },
  {
    change: "New in-app monitor alerts sales@nativedigital.co.za about errors, dead clicks, rage clicks, failed actions, undelivered emails, failed page checks and new versions.",
    userImpact: "No visible change for users; problems are reported to the operator within minutes.",
  },
];
