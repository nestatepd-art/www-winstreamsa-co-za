
-- =========================================================
-- Follow-up tables for quotes and invoices
-- =========================================================

CREATE TABLE public.quote_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence smallint NOT NULL CHECK (sequence BETWEEN 1 AND 3),
  scheduled_for timestamptz NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','skipped','failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, sequence)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_followups TO authenticated;
GRANT ALL ON public.quote_followups TO service_role;
ALTER TABLE public.quote_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quote followups"
  ON public.quote_followups FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_quote_followups_due
  ON public.quote_followups (scheduled_for)
  WHERE status = 'scheduled';

CREATE TRIGGER quote_followups_set_updated_at
  BEFORE UPDATE ON public.quote_followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoice_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence smallint NOT NULL CHECK (sequence BETWEEN 1 AND 3),
  scheduled_for timestamptz NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','skipped','failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, sequence)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_followups TO authenticated;
GRANT ALL ON public.invoice_followups TO service_role;
ALTER TABLE public.invoice_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own invoice followups"
  ON public.invoice_followups FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_invoice_followups_due
  ON public.invoice_followups (scheduled_for)
  WHERE status = 'scheduled';

CREATE TRIGGER invoice_followups_set_updated_at
  BEFORE UPDATE ON public.invoice_followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Auto-seed 3 follow-ups on quote insert (day 3, 7, 14)
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_quote_followups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz text;
BEGIN
  SELECT business_name INTO biz FROM public.business_profiles WHERE user_id = NEW.user_id;
  biz := COALESCE(NULLIF(biz, ''), 'our team');

  INSERT INTO public.quote_followups (quote_id, user_id, sequence, scheduled_for, subject, body) VALUES
  (NEW.id, NEW.user_id, 1, NEW.created_at + interval '3 days',
   'Following up on quote ' || NEW.quote_number,
   'Hi there,' || E'\n\n' ||
   'Just checking in on quote ' || NEW.quote_number || ' we sent through. Any questions or adjustments you''d like us to make?' || E'\n\n' ||
   'Happy to talk it through.' || E'\n\n' ||
   'Kind regards,' || E'\n' || biz),
  (NEW.id, NEW.user_id, 2, NEW.created_at + interval '7 days',
   'Quick nudge on quote ' || NEW.quote_number,
   'Hi there,' || E'\n\n' ||
   'A gentle reminder about quote ' || NEW.quote_number || '. Still keen to get started when you are.' || E'\n\n' ||
   'Let us know if anything needs tweaking.' || E'\n\n' ||
   'Thanks,' || E'\n' || biz),
  (NEW.id, NEW.user_id, 3, NEW.created_at + interval '14 days',
   'Closing the loop on quote ' || NEW.quote_number,
   'Hi there,' || E'\n\n' ||
   'Wrapping up our follow-ups on quote ' || NEW.quote_number || '. If the timing isn''t right, no problem — just reply and let us know.' || E'\n\n' ||
   'Otherwise, we''ll assume you''d prefer we hold off.' || E'\n\n' ||
   'Warm regards,' || E'\n' || biz);
  RETURN NEW;
END;
$$;

CREATE TRIGGER quotes_seed_followups
  AFTER INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.seed_quote_followups();

-- =========================================================
-- Auto-seed 3 follow-ups on invoice insert (day 3, 10, 21 after due_date; fallback created_at + 30)
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_invoice_followups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz text;
  base_ts timestamptz;
BEGIN
  SELECT business_name INTO biz FROM public.business_profiles WHERE user_id = NEW.user_id;
  biz := COALESCE(NULLIF(biz, ''), 'our team');
  base_ts := COALESCE((NEW.due_date::timestamptz), NEW.created_at + interval '30 days');

  INSERT INTO public.invoice_followups (invoice_id, user_id, sequence, scheduled_for, subject, body) VALUES
  (NEW.id, NEW.user_id, 1, base_ts + interval '3 days',
   'Friendly reminder: invoice ' || NEW.invoice_number,
   'Hi there,' || E'\n\n' ||
   'A friendly reminder that invoice ' || NEW.invoice_number || ' is now due. If it''s already paid, thank you — please ignore this note.' || E'\n\n' ||
   'Otherwise, we''d appreciate settlement at your earliest convenience.' || E'\n\n' ||
   'Kind regards,' || E'\n' || biz),
  (NEW.id, NEW.user_id, 2, base_ts + interval '10 days',
   'Second reminder: invoice ' || NEW.invoice_number,
   'Hi there,' || E'\n\n' ||
   'Following up on invoice ' || NEW.invoice_number || ' — please let us know when settlement can be expected, or if there''s anything holding it up.' || E'\n\n' ||
   'Thanks,' || E'\n' || biz),
  (NEW.id, NEW.user_id, 3, base_ts + interval '21 days',
   'Final reminder: invoice ' || NEW.invoice_number,
   'Hi there,' || E'\n\n' ||
   'This is our final automated reminder for invoice ' || NEW.invoice_number || '. Please arrange payment or get in touch so we can resolve it.' || E'\n\n' ||
   'Regards,' || E'\n' || biz);
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_seed_followups
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.seed_invoice_followups();

-- =========================================================
-- Backfill existing quotes and invoices that have no follow-ups yet
-- =========================================================
INSERT INTO public.quote_followups (quote_id, user_id, sequence, scheduled_for, subject, body)
SELECT q.id, q.user_id, s.seq,
       q.created_at + (s.days || ' days')::interval,
       CASE s.seq
         WHEN 1 THEN 'Following up on quote ' || q.quote_number
         WHEN 2 THEN 'Quick nudge on quote ' || q.quote_number
         ELSE 'Closing the loop on quote ' || q.quote_number
       END,
       CASE s.seq
         WHEN 1 THEN 'Hi there,' || E'\n\n' || 'Just checking in on quote ' || q.quote_number || ' we sent through. Any questions or adjustments you''d like us to make?' || E'\n\n' || 'Happy to talk it through.' || E'\n\n' || 'Kind regards,' || E'\n' || COALESCE(NULLIF(bp.business_name, ''), 'our team')
         WHEN 2 THEN 'Hi there,' || E'\n\n' || 'A gentle reminder about quote ' || q.quote_number || '. Still keen to get started when you are.' || E'\n\n' || 'Let us know if anything needs tweaking.' || E'\n\n' || 'Thanks,' || E'\n' || COALESCE(NULLIF(bp.business_name, ''), 'our team')
         ELSE 'Hi there,' || E'\n\n' || 'Wrapping up our follow-ups on quote ' || q.quote_number || '. If the timing isn''t right, no problem — just reply and let us know.' || E'\n\n' || 'Otherwise, we''ll assume you''d prefer we hold off.' || E'\n\n' || 'Warm regards,' || E'\n' || COALESCE(NULLIF(bp.business_name, ''), 'our team')
       END
FROM public.quotes q
LEFT JOIN public.business_profiles bp ON bp.user_id = q.user_id
CROSS JOIN (VALUES (1,3),(2,7),(3,14)) AS s(seq, days)
WHERE NOT EXISTS (SELECT 1 FROM public.quote_followups f WHERE f.quote_id = q.id AND f.sequence = s.seq);

INSERT INTO public.invoice_followups (invoice_id, user_id, sequence, scheduled_for, subject, body)
SELECT i.id, i.user_id, s.seq,
       COALESCE(i.due_date::timestamptz, i.created_at + interval '30 days') + (s.days || ' days')::interval,
       CASE s.seq
         WHEN 1 THEN 'Friendly reminder: invoice ' || i.invoice_number
         WHEN 2 THEN 'Second reminder: invoice ' || i.invoice_number
         ELSE 'Final reminder: invoice ' || i.invoice_number
       END,
       CASE s.seq
         WHEN 1 THEN 'Hi there,' || E'\n\n' || 'A friendly reminder that invoice ' || i.invoice_number || ' is now due. If it''s already paid, thank you — please ignore this note.' || E'\n\n' || 'Otherwise, we''d appreciate settlement at your earliest convenience.' || E'\n\n' || 'Kind regards,' || E'\n' || COALESCE(NULLIF(bp.business_name, ''), 'our team')
         WHEN 2 THEN 'Hi there,' || E'\n\n' || 'Following up on invoice ' || i.invoice_number || ' — please let us know when settlement can be expected, or if there''s anything holding it up.' || E'\n\n' || 'Thanks,' || E'\n' || COALESCE(NULLIF(bp.business_name, ''), 'our team')
         ELSE 'Hi there,' || E'\n\n' || 'This is our final automated reminder for invoice ' || i.invoice_number || '. Please arrange payment or get in touch so we can resolve it.' || E'\n\n' || 'Regards,' || E'\n' || COALESCE(NULLIF(bp.business_name, ''), 'our team')
       END
FROM public.invoices i
LEFT JOIN public.business_profiles bp ON bp.user_id = i.user_id
CROSS JOIN (VALUES (1,3),(2,10),(3,21)) AS s(seq, days)
WHERE NOT EXISTS (SELECT 1 FROM public.invoice_followups f WHERE f.invoice_id = i.id AND f.sequence = s.seq);
