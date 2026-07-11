-- Keep only the newest 12 mock exam attempts per user.
-- This aligns the database with the app's existing 12-attempt history limit.

CREATE INDEX IF NOT EXISTS mock_exam_attempts_user_completed_idx
ON public.mock_exam_attempts (user_id, completed_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.trim_mock_exam_attempts_for_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.mock_exam_attempts
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id
      FROM public.mock_exam_attempts
      WHERE user_id = NEW.user_id
      ORDER BY completed_at DESC, id DESC
      LIMIT 12
    );

  RETURN NEW;
END;
$$;

DELETE FROM public.mock_exam_attempts
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY completed_at DESC, id DESC
      ) AS row_num
    FROM public.mock_exam_attempts
  ) ranked_attempts
  WHERE row_num > 12
);

DROP TRIGGER IF EXISTS trim_mock_exam_attempts_for_user_trigger
ON public.mock_exam_attempts;

CREATE TRIGGER trim_mock_exam_attempts_for_user_trigger
AFTER INSERT OR UPDATE OF completed_at
ON public.mock_exam_attempts
FOR EACH ROW
EXECUTE FUNCTION public.trim_mock_exam_attempts_for_user();
