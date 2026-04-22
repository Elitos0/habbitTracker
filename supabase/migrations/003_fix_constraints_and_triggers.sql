-- ============================================================
-- Fix broken regex CHECKs, harden auth trigger, tighten tags.
--
-- Postgres POSIX regex (`~`) does NOT support `\d`, so the old
-- CHECK constraints from 001 / 002 rejected every valid time.
-- ============================================================

-- ── habits.scheduled_time ─────────────────────────────────────
ALTER TABLE public.habits
  DROP CONSTRAINT IF EXISTS habits_scheduled_time_check;

ALTER TABLE public.habits
  ADD CONSTRAINT habits_scheduled_time_check
  CHECK (
    scheduled_time IS NULL
    OR scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

-- ── habit_checklist_items.scheduled_time ──────────────────────
ALTER TABLE public.habit_checklist_items
  DROP CONSTRAINT IF EXISTS habit_checklist_items_scheduled_time_check;

ALTER TABLE public.habit_checklist_items
  ADD CONSTRAINT habit_checklist_items_scheduled_time_check
  CHECK (
    scheduled_time IS NULL
    OR scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

-- ── reminder_rules.time_of_day ────────────────────────────────
ALTER TABLE public.reminder_rules
  DROP CONSTRAINT IF EXISTS reminder_rules_time_of_day_check;

ALTER TABLE public.reminder_rules
  ADD CONSTRAINT reminder_rules_time_of_day_check
  CHECK (time_of_day ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- ── Tags: prevent duplicate tag names per user ────────────────
-- Idempotent: drop old rows that would conflict before adding the index.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, name ORDER BY created_at ASC, id ASC) AS rn
  FROM public.tags
)
DELETE FROM public.tags t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_unique
  ON public.tags (user_id, name);

-- ── handle_new_user: idempotent on re-applied schemas ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Schema version bump ───────────────────────────────────────
INSERT INTO public.schema_meta (key, value)
VALUES ('schema_version', '4')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

NOTIFY pgrst, 'reload schema';
