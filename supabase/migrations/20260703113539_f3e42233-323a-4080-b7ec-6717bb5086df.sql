
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Columns on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS last_nudged_at timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_nudge_enabled boolean NOT NULL DEFAULT true;

-- Columns on quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS last_nudged_at timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_nudge_enabled boolean NOT NULL DEFAULT true;

-- Master switch on business_profiles
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS auto_nudge_enabled boolean NOT NULL DEFAULT true;

-- Nudge log table
CREATE TABLE IF NOT EXISTS public.nudge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('invoice','quote')),
  record_id uuid NOT NULL,
  sent_to text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nudge_log TO authenticated;
GRANT ALL ON public.nudge_log TO service_role;

ALTER TABLE public.nudge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nudge log"
  ON public.nudge_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nudge_log_user_sent_at ON public.nudge_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_nudge_due ON public.invoices(due_date, status) WHERE auto_nudge_enabled = true;
CREATE INDEX IF NOT EXISTS idx_quotes_nudge_created ON public.quotes(created_at, status) WHERE auto_nudge_enabled = true;
