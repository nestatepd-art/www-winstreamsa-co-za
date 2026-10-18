# Architecture rules
- Reminder approval links display a read-only page on GET and apply decisions only on POST, because mail scanners must not send or cancel reminders.
- Privileged reminder clients preserve the opaque-key apikey-only fetch handling, because opaque credentials are not bearer JWTs.