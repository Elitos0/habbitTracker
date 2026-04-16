-- ============================================================
-- Habits Tracker — Production PostgreSQL Schema
-- Run this against your Supabase PostgreSQL database.
-- ============================================================

-- PostgreSQL 13+ provides gen_random_uuid() via pg_catalog in Supabase images.
-- Avoid CREATE EXTENSION here: self-hosted Supabase wraps extension creation
-- with custom scripts that require elevated pg_read_file permissions.

-- ─── Profiles ────────────────────────────────────────────────
-- Auto-created on first sign-in via trigger.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  app_language TEXT NOT NULL DEFAULT 'ru',
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Tags ────────────────────────────────────────────────────
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  color TEXT CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tags_user ON public.tags(user_id);

-- ─── Habits ──────────────────────────────────────────────────
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 500),
  color TEXT NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  icon TEXT,
  scheduled_time TEXT CHECK (scheduled_time ~ '^\d{2}:\d{2}$'),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_habits_user ON public.habits(user_id);
CREATE INDEX idx_habits_user_active ON public.habits(user_id) WHERE is_archived = false;

-- ─── Habit ↔ Tag ─────────────────────────────────────────────
CREATE TABLE public.habit_tags (
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (habit_id, tag_id)
);

-- ─── Schedules ───────────────────────────────────────────────
CREATE TABLE public.habit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily','weekdays','interval','times_per_day')),
  interval_days INTEGER CHECK (interval_days >= 1),
  weekdays TEXT, -- JSON array, e.g. [1,3,5]
  start_date DATE NOT NULL,
  end_date DATE,
  times_per_day INTEGER NOT NULL DEFAULT 1 CHECK (times_per_day >= 1),
  active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_schedules_habit ON public.habit_schedules(habit_id);

-- ─── Checklist Items ─────────────────────────────────────────
CREATE TABLE public.habit_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
  slot_type TEXT CHECK (slot_type IN ('morning','afternoon','evening','custom')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_checklist_habit ON public.habit_checklist_items(habit_id);

-- ─── Completion Records ──────────────────────────────────────
CREATE TABLE public.completion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  completion_status TEXT NOT NULL DEFAULT 'none' CHECK (completion_status IN ('none','partial','done')),
  note TEXT CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, local_date)
);
CREATE INDEX idx_completions_habit_date ON public.completion_records(habit_id, local_date);

-- ─── Sub-Item Completions ────────────────────────────────────
CREATE TABLE public.sub_item_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_record_id UUID NOT NULL REFERENCES public.completion_records(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.habit_checklist_items(id) ON DELETE CASCADE,
  is_done BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_sub_completions_record ON public.sub_item_completions(completion_record_id);

-- ─── Reminder Rules ──────────────────────────────────────────
CREATE TABLE public.reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('android','browser')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('daily','weekly','interval')),
  time_of_day TEXT NOT NULL CHECK (time_of_day ~ '^\d{2}:\d{2}$'),
  weekday INTEGER CHECK (weekday BETWEEN 0 AND 6),
  interval_days INTEGER CHECK (interval_days >= 1),
  enabled BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_reminders_habit ON public.reminder_rules(habit_id);

-- ─── Schema Meta ─────────────────────────────────────────────
CREATE TABLE public.schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO public.schema_meta (key, value) VALUES ('schema_version', '2');

-- ============================================================
-- API GRANTS
-- PostgREST still requires SQL privileges; RLS policies then
-- restrict which rows each JWT role can actually access.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.schema_meta TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.tags,
  public.habits,
  public.habit_tags,
  public.habit_schedules,
  public.habit_checklist_items,
  public.completion_records,
  public.sub_item_completions,
  public.reminder_rules
TO authenticated, service_role;

GRANT SELECT ON
  public.profiles,
  public.tags,
  public.habits,
  public.habit_tags,
  public.habit_schedules,
  public.habit_checklist_items,
  public.completion_records,
  public.sub_item_completions,
  public.reminder_rules
TO anon;

-- ============================================================
-- TRIGGER: auto-create profile on sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_completions_updated_at
  BEFORE UPDATE ON public.completion_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Every table is locked down so users only see their own data.
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_item_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own row
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tags: full CRUD on own tags
CREATE POLICY tags_select ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tags_insert ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tags_update ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY tags_delete ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Habits: full CRUD on own habits
CREATE POLICY habits_select ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY habits_insert ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY habits_update ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY habits_delete ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- Habit tags: access via habit ownership
CREATE POLICY habit_tags_select ON public.habit_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY habit_tags_insert ON public.habit_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY habit_tags_delete ON public.habit_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));

-- Schedules: via habit ownership
CREATE POLICY schedules_select ON public.habit_schedules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY schedules_insert ON public.habit_schedules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY schedules_update ON public.habit_schedules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY schedules_delete ON public.habit_schedules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));

-- Checklist items: via habit ownership
CREATE POLICY checklist_select ON public.habit_checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY checklist_insert ON public.habit_checklist_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY checklist_update ON public.habit_checklist_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY checklist_delete ON public.habit_checklist_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));

-- Completion records: via habit ownership
CREATE POLICY completions_select ON public.completion_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY completions_insert ON public.completion_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY completions_update ON public.completion_records FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY completions_delete ON public.completion_records FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));

-- Sub-item completions: via completion → habit ownership
CREATE POLICY sub_completions_select ON public.sub_item_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.completion_records cr
    JOIN public.habits h ON h.id = cr.habit_id
    WHERE cr.id = completion_record_id AND h.user_id = auth.uid()
  ));
CREATE POLICY sub_completions_insert ON public.sub_item_completions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.completion_records cr
    JOIN public.habits h ON h.id = cr.habit_id
    WHERE cr.id = completion_record_id AND h.user_id = auth.uid()
  ));
CREATE POLICY sub_completions_update ON public.sub_item_completions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.completion_records cr
    JOIN public.habits h ON h.id = cr.habit_id
    WHERE cr.id = completion_record_id AND h.user_id = auth.uid()
  ));
CREATE POLICY sub_completions_delete ON public.sub_item_completions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.completion_records cr
    JOIN public.habits h ON h.id = cr.habit_id
    WHERE cr.id = completion_record_id AND h.user_id = auth.uid()
  ));

-- Reminder rules: via habit ownership
CREATE POLICY reminders_select ON public.reminder_rules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY reminders_insert ON public.reminder_rules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY reminders_update ON public.reminder_rules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
CREATE POLICY reminders_delete ON public.reminder_rules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid()));
