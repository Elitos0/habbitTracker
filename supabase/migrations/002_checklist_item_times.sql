-- Add optional planned execution time for each checklist item.
-- Used by compound habits such as "take medicine: morning/day/evening".

ALTER TABLE public.habit_checklist_items
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT
  CHECK (scheduled_time ~ '^\d{2}:\d{2}$');

INSERT INTO public.schema_meta (key, value)
VALUES ('schema_version', '3')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

NOTIFY pgrst, 'reload schema';
