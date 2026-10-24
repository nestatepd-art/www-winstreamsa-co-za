# Architecture rules
- Reminder approval links display a read-only page on GET and apply decisions only on POST, because mail scanners must not send or cancel reminders.
- Privileged reminder clients preserve the opaque-key apikey-only fetch handling, because opaque credentials are not bearer JWTs.
- Deleted business records (quotes, invoices, clients, proposals, items, profiles, recurring) are copied to public.deleted_records by a BEFORE DELETE trigger, because account removal cascades and backups only cover ~14 days.
- Shared drafting uses a server-only Responses stream and centrally defined model, reasoning effort and schema configuration, because every document output must use consistent drafting quality without exposing credentials.
- Proposal generation and revision share a dedicated prompt and format-aware validation; explicit communication requests override proposal headings, because the workspace must honour the requested deliverable on new and saved drafts.
- Proposal preview, download and email attachment use the same generated PDF blob, because clients must receive exactly the document the owner reviewed.
