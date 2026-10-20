# Architecture rules
- Reminder approval links display a read-only page on GET and apply decisions only on POST, because mail scanners must not send or cancel reminders.
- Privileged reminder clients preserve the opaque-key apikey-only fetch handling, because opaque credentials are not bearer JWTs.- Deleted business records (quotes, invoices, clients, proposals, items, profiles, recurring) are copied to public.deleted_records by a BEFORE DELETE trigger, because account removal cascades and backups only cover ~14 days.
