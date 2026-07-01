
CREATE TABLE public.ai_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  model_used TEXT,
  models_tried TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  finish_reason TEXT,
  duration_ms INTEGER,
  output_length INTEGER,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ai_generations" ON public.ai_generations
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX ai_generations_user_created_idx ON public.ai_generations(user_id, created_at DESC);
