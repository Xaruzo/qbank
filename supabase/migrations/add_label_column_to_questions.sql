-- Add 'label' column to public.questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS label TEXT DEFAULT '';
