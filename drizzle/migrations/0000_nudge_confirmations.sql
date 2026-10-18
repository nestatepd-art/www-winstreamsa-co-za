CREATE TABLE public.nudge_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('quote','invoice')),
  record_id uuid NOT NULL,
  followup_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','cancelled_all','expired')),
  expires_at timestamptz NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nudge_confirmations_pending_idx ON public.nudge_confirmations (status, expires_at);
CREATE INDEX nudge_confirmations_followup_idx ON public.nudge_confirmations (followup_id);
GRANT SELECT ON public.nudge_confirmations TO authenticated;
GRANT ALL ON public.nudge_confirmations TO service_role;
ALTER TABLE public.nudge_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own nudge confirmations" ON public.nudge_confirmations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.business_profiles ADD COLUMN nudge_unanswered_count integer NOT NULL DEFAULT 0;