CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  display_name TEXT NOT NULL,
  business_name TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read approved reviews (for public /reviews page + SEO)
CREATE POLICY "Approved reviews are public"
  ON public.reviews FOR SELECT
  USING (approved = true);

-- Signed-in users can see their own review regardless of approval status
CREATE POLICY "Users can view their own review"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Signed-in users can insert their own review
CREATE POLICY "Users can insert their own review"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Signed-in users can edit their own review (resets approval)
CREATE POLICY "Users can update their own review"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own review
CREATE POLICY "Users can delete their own review"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can do anything
CREATE POLICY "Admins manage all reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reset approval when the author edits body/rating
CREATE OR REPLACE FUNCTION public.reviews_reset_approval_on_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.title IS DISTINCT FROM OLD.title THEN
      NEW.approved := false;
      NEW.featured := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_update_trigger
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_reset_approval_on_edit();

CREATE INDEX reviews_approved_created_idx ON public.reviews (approved, created_at DESC);