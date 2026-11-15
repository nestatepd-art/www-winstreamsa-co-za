CREATE TABLE public.monitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  fingerprint text NOT NULL,
  title text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  path text,
  build_id text,
  user_agent text,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX monitor_events_fp_idx ON public.monitor_events (fingerprint, created_at DESC);
CREATE INDEX monitor_events_created_idx ON public.monitor_events (created_at DESC);
GRANT SELECT ON public.monitor_events TO authenticated;
GRANT ALL ON public.monitor_events TO service_role;
ALTER TABLE public.monitor_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view monitor events" ON public.monitor_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.monitor_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.monitor_state TO service_role;
ALTER TABLE public.monitor_state ENABLE ROW LEVEL SECURITY;