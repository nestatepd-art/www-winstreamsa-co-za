CREATE TABLE public.recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Monthly invoice',
  day_of_month smallint NOT NULL DEFAULT 1,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  vat_rate numeric NOT NULL DEFAULT 15,
  notes text,
  terms text,
  due_days integer NOT NULL DEFAULT 14,
  email_subject text,
  email_body text,
  auto_send boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  next_run_date date NOT NULL,
  last_run_at timestamptz,
  last_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  run_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoices TO authenticated;
GRANT ALL ON public.recurring_invoices TO service_role;

ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their recurring invoices"
  ON public.recurring_invoices FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_recurring_invoices_updated_at
  BEFORE UPDATE ON public.recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_recurring_invoices_due ON public.recurring_invoices (next_run_date) WHERE active;

CREATE OR REPLACE FUNCTION public.recurring_next_run(_day smallint, _from date)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (date_trunc('month', _from + interval '1 month')
          + (LEAST(GREATEST(_day, 1),
                   EXTRACT(DAY FROM (date_trunc('month', _from + interval '1 month')
                     + interval '1 month - 1 day'))::int) - 1) * interval '1 day')::date
$$;

REVOKE EXECUTE ON FUNCTION public.recurring_next_run(smallint, date) FROM anon;
