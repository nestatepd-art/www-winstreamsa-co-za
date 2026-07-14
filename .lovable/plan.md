
# Quote & Invoice: Preview + Editable Follow-ups + Server-side Send

Bringing the screenshot's UX to WinStream. Ships for both quotes and invoices.

## 1. Database (one migration)

Two new tables (identical shape, one per record type — keeps FKs clean):

- `quote_followups` — id, quote_id (FK → quotes, ON DELETE CASCADE), user_id, sequence (1|2|3), scheduled_for (timestamptz), subject, body, status (`scheduled` | `sent` | `skipped` | `failed`), sent_at, error, created_at, updated_at
- `invoice_followups` — id, invoice_id (FK → invoices, ON DELETE CASCADE), user_id, sequence (1|2|3), scheduled_for, subject, body, status, sent_at, error, created_at, updated_at

Both:
- RLS: owner (`user_id = auth.uid()`) full access; `service_role` full.
- GRANTs to `authenticated` + `service_role`.
- Unique index on `(record_id, sequence)`.

Auto-seed 3 follow-ups whenever a quote/invoice is created (trigger):
- **Quote**: day 3, 7, 14 after `created_at`. Default subject/body reference the quote number, business name, total.
- **Invoice**: day 3, 10, 21 after `due_date` (fallback `created_at + 30`). Default templates emphasise "friendly reminder / past due".

Trigger uses the business profile's `business_name` for the from-label in the seeded body.

## 2. Server functions (`src/lib/followups.functions.ts`)

All use `requireSupabaseAuth`; RLS scopes to the caller.

- `listFollowups({ recordType, recordId })` → 3 rows
- `updateFollowup({ recordType, id, subject, body, scheduled_for })`
- `skipFollowup({ recordType, id })` → status='skipped'
- `sendFollowupNow({ recordType, id })` → sends via Resend (server-side), sets status='sent', writes `nudge_log` row for the Reminders page.
- `sendRecordNow({ recordType, id, subject, body })` → for the top "Send now" button (the initial send, not a follow-up). PDF is generated **client-side** and passed as base64 attachment.

Resend send helper is extracted from `auto-nudge.ts` into `src/lib/resend-send.server.ts` and reused. Supports attachments (`attachments: [{ filename, content: base64 }]`).

## 3. Update cron endpoint

`/api/public/hooks/auto-nudge` swaps its ad-hoc "which invoices are overdue" logic for:
- Select `*_followups` where `status='scheduled'` AND `scheduled_for <= now()` AND parent record's `auto_nudge_enabled = true`.
- Send via the shared Resend helper.
- Mark row `sent` / `failed`; still writes `nudge_log`.
- Keeps the 200/run cap.

Old `nudge_count` / `last_nudged_at` columns stay for backward compatibility but are no longer the source of truth.

## 4. UI

### Quote detail (`src/routes/_authenticated/quotes.$quoteId.tsx`) and Invoice detail

Add three new panels below existing content:

**PDF preview card**
- Client-side generates PDF blob via existing `generateDocumentPdf`
- Renders in an `<iframe src={objectURL}>` (matching screenshot). "PDF" download button remains.

**Automatic follow-ups card (right column)**
- Toggle switch bound to record's `auto_nudge_enabled`. Same field already exists.

**Follow-up messages section**
- Renders 3 cards (Follow-up 1/2/3) each with:
  - Header: "day N" + "Scheduled for {date}" + status badge (Scheduled / Sent / Skipped / Failed)
  - Editable Subject + Body textarea (auto-save on blur via `updateFollowup`)
  - Buttons: **Edit** (focus body), **Skip**, **Send now** (calls `sendFollowupNow`)
  - Sent/skipped rows show timestamp and disable inputs.

### "Send" button on quote/invoice header
- Replaces current mailto flow with `sendRecordNow`. Shows toast "Sent to client@example.com".
- Client email required — button disabled + tooltip when missing.

### Reminders page
- No schema change; already reads `nudge_log`. Will now show both scheduled-cron sends and manual "Send now" sends.

## 5. Out of scope (deliberate)

- WhatsApp send (needs Meta Cloud API verification — separate track).
- Multi-recipient / CC / BCC (single client email only, matching current data model).
- Rich-text body editor (plain textarea → wrapped in branded HTML on send).
- Retroactive backfill of follow-ups for existing quotes/invoices — trigger fires on insert only; existing records get a one-off backfill in the migration.

## 6. Technical notes

- PDF attachment size: base64 payload passes through server fn → Resend. jsPDF quotes are ~40-80 KB, well within Resend's 40 MB limit.
- Server-side sender stays `WinStream Reminders <onboarding@resend.dev>` with `reply_to` = business owner. Custom sending domains remain a future upgrade (needs per-tenant Resend domain verification).
- All send events (initial + follow-ups) log to `nudge_log` so the Reminders history stays authoritative.
- The client-side send helper (`src/lib/email-compose.ts` mailto path) stays available as a fallback but is no longer wired to the Send button.

Reply "go" and I'll ship it.
