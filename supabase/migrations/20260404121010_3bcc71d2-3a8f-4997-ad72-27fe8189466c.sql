
-- Create errors table
CREATE TABLE public.errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_text TEXT,
  specialty TEXT,
  subtopic TEXT,
  exam_board TEXT,
  error_type TEXT CHECK (error_type IN ('wrong', 'guess', 'doubt')),
  marked_answer TEXT,
  correct_answer TEXT,
  user_comment TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own errors" ON public.errors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own errors" ON public.errors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own errors" ON public.errors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own errors" ON public.errors FOR DELETE USING (auth.uid() = user_id);

-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  error_id UUID REFERENCES public.errors(id) ON DELETE CASCADE NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  next_review TIMESTAMPTZ NOT NULL DEFAULT now(),
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor NUMERIC NOT NULL DEFAULT 2.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flashcards" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flashcards" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcards" ON public.flashcards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_errors_updated_at
  BEFORE UPDATE ON public.errors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
