CREATE TABLE public.deleted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  user_id uuid,
  data jsonb NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deleted_records TO authenticated;
GRANT ALL ON public.deleted_records TO service_role;
ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own deleted records" ON public.deleted_records FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX deleted_records_user_idx ON public.deleted_records(user_id, deleted_at DESC);

CREATE OR REPLACE FUNCTION public.archive_deleted_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.deleted_records(table_name, record_id, user_id, data)
  VALUES (TG_TABLE_NAME, OLD.id, OLD.user_id, to_jsonb(OLD));
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.archive_deleted_row() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['quotes','quote_items','invoices','invoice_items','clients','proposals','business_profiles','recurring_invoices'] LOOP
    EXECUTE format('CREATE TRIGGER archive_on_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_row()', t);
  END LOOP;
END $$;