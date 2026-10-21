# Architecture rules
- Reminder approval links display a read-only page on GET and apply decisions only on POST, because mail scanners must not send or cancel reminders.
- Privileged reminder clients preserve the opaque-key apikey-only fetch handling, because opaque credentials are not bearer JWTs.
- Deleted business records (quotes, invoices, clients, proposals, items, profiles, recurring) are copied to public.deleted_records by a BEFORE DELETE trigger, because account removal cascades and backups only cover ~14 days.
- Shared drafting uses a server-only Responses stream and centrally defined model/schema configuration, because every output must use consistent current drafting without exposing credentials.
- Proposal generation and revision share a dedicated prompt and input schema, because document depth and factual preservation must be consistent on new and saved proposals.
- Proposal preview, download and email attachment use the same generated PDF blob, because clients must receive exactly the document the owner reviewed.
