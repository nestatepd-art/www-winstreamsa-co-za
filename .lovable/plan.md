# Scheduled Auto-Nudge System

Make the blog's "auto follow-ups on quiet quotes/invoices" claim real. Email-only for now (WhatsApp Cloud API needs Meta Business verification — separate track).

## What gets built

### 1. Database (migration)

- Add columns to `invoices` and `quotes`:
  - `last_nudged_at timestamptz`
  - `nudge_count int default 0`
  - `auto_nudge_enabled boolean default true`
- New table `nudge_log` (id, record_type, record_id, user_id, sent_to, subject, sent_at, status, error) with RLS + GRANTs so users see their own nudge history.
- Small helper view or SQL used by the cron endpoint to find due candidates.

### 2. Nudge rules (per record)

- **Invoices**: status in (`sent`, `viewed`, `overdue`) AND `due_date` passed by ≥1 day AND (`last_nudged_at` null OR ≥ 7 days ago) AND `nudge_count < 3`.
- **Quotes**: status in (`sent`, `viewed`) AND `created_at` ≥ 5 days ago AND (`last_nudged_at` null OR ≥ 7 days ago) AND `nudge_count < 2`.
- Skip if `auto_nudge_enabled = false` or client has no email.
- On send: mark invoice `overdue` if past due.

### 3. Public cron endpoint

`src/routes/api/public/hooks/auto-nudge.ts` (POST):
- Verify `apikey` header = Supabase anon key.
- Use `supabaseAdmin` to select due invoices/quotes joined with clients + business_profiles.
- For each, call Resend via the connector gateway to send a branded reminder email (from the business's name, reply-to their email).
- Update `last_nudged_at`, `nudge_count`, insert `nudge_log` row.
- Return JSON summary.

### 4. Scheduling

- `pg_cron` job running daily at 08:00 SAST (06:00 UTC) hitting the endpoint.
- Enable `pg_cron` + `pg_net` if not already.

### 5. UI

- Settings page: master "Send automatic reminders" toggle (writes to `business_profiles.auto_nudge_enabled` — add column).
- Invoice/Quote detail: small "Auto-nudge: On/Off" toggle + "Last nudged: 3 days ago (2 sent)" line.
- New "Reminders" page under sidebar showing `nudge_log` history (last 50).

### 6. Email template

Simple inline-styled HTML: business name header, "Friendly reminder about {invoice/quote} #X for {amount}", due date, PDF link placeholder (attachments still not supported in cron path — link to hosted view later), signature.

## Technical notes

- Resend connector already available (`RESEND_API_KEY` + `LOVABLE_API_KEY`).
- Uses `from: "WinStream Reminders <onboarding@resend.dev>"` until user configures a verified domain; `reply_to` set to business owner's email so replies go to them.
- No per-email delivery events yet — `nudge_log.status` = `sent` / `failed` from Resend response.
- Rate-limit protection: endpoint caps at 200 sends per run.

## Out of scope (call out explicitly)

- WhatsApp sends (needs Meta verification + Cloud API — separate feature).
- Inbound "customer requests quote via WhatsApp → AI drafts it" (flagship blog claim, next milestone).
- Custom nudge cadence per user (v2).

Confirm and I'll build it.
