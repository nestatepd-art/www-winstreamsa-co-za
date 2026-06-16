
CREATE TYPE public.proposal_status AS ENUM ('draft','sent','viewed','accepted','rejected','expired');
CREATE TYPE public.comm_channel AS ENUM ('email','whatsapp','sms');
CREATE TYPE public.comm_direction AS ENUM ('outbound','inbound');
CREATE TYPE public.comm_status AS ENUM ('queued','simulated','sent','delivered','failed');

CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New proposal',
  brief TEXT,
  content TEXT,
  status proposal_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own proposals" ON public.proposals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients ON DELETE SET NULL,
  channel comm_channel NOT NULL,
  direction comm_direction NOT NULL DEFAULT 'outbound',
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status comm_status NOT NULL DEFAULT 'simulated',
  provider TEXT,
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own communications" ON public.communications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_proposals_user ON public.proposals(user_id, created_at DESC);
CREATE INDEX idx_comms_user ON public.communications(user_id, created_at DESC);
CREATE INDEX idx_comms_proposal ON public.communications(proposal_id);
