-- Enable RLS on all tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for public.questions (allow full access for now, adjust as needed)
CREATE POLICY "Allow public read access to questions"
ON public.questions
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to questions"
ON public.questions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to questions"
ON public.questions
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access to questions"
ON public.questions
FOR DELETE
USING (true);

-- Policies for public.mock_exam_attempts (user-specific)
CREATE POLICY "Users can read their own mock exam attempts"
ON public.mock_exam_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mock exam attempts"
ON public.mock_exam_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mock exam attempts"
ON public.mock_exam_attempts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mock exam attempts"
ON public.mock_exam_attempts
FOR DELETE
USING (auth.uid() = user_id);

-- Policies for public.question_tips (user-specific)
CREATE POLICY "Users can read their own question tips"
ON public.question_tips
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own question tips"
ON public.question_tips
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question tips"
ON public.question_tips
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own question tips"
ON public.question_tips
FOR DELETE
USING (auth.uid() = user_id);

-- Policies for public.question_admins
CREATE POLICY "Allow public read access to question admins"
ON public.question_admins
FOR SELECT
USING (true);

-- Policies for public.user_favorites (user-specific)
CREATE POLICY "Users can read their own favorites"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.user_favorites
FOR DELETE
USING (auth.uid() = user_id);
