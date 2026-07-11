ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.questions
SET updated_at = COALESCE(updated_at, deleted_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.questions
ALTER COLUMN updated_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS questions_updated_at_idx
ON public.questions (updated_at DESC);
