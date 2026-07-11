ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS questions_deleted_at_created_at_idx
ON public.questions (deleted_at, created_at);
