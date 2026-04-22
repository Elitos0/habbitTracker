/**
 * Shared Supabase data-fetching helpers used by screens
 * that need direct DB access beyond the Zustand store.
 */
import { addDays } from "@/src/lib/date/localDay";
import { supabase } from "@/src/lib/supabase/client";

/** Log Supabase errors in dev; callers can treat the result as empty. */
function logError(context: string, error: unknown): void {
  if (error) console.warn(`[supabase:${context}]`, error);
}

/** Fetch completion records for a specific habit in a date range */
export async function fetchHabitCompletions(
  habitId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("completion_records")
    .select("local_date, completion_status")
    .eq("habit_id", habitId)
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .neq("completion_status", "none");

  logError("fetchHabitCompletions", error);

  const map: Record<string, string> = {};
  for (const r of data ?? []) {
    map[r.local_date] = r.completion_status;
  }
  return map;
}

/** Fetch all completion records across all user habits in a date range (with habit color) */
export async function fetchAllCompletions(
  startDate: string,
  endDate: string,
): Promise<Record<string, { color: string; status: string }[]>> {
  const { data, error } = await supabase
    .from("completion_records")
    .select("local_date, completion_status, habits(color)")
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .neq("completion_status", "none")
    .order("local_date");

  logError("fetchAllCompletions", error);

  const map: Record<string, { color: string; status: string }[]> = {};
  for (const r of (data ?? []) as Array<{
    local_date: string;
    completion_status: string;
    habits: { color: string } | { color: string }[] | null;
  }>) {
    const habit = Array.isArray(r.habits) ? r.habits[0] : r.habits;
    const color = habit?.color ?? "#888";
    if (!map[r.local_date]) map[r.local_date] = [];
    map[r.local_date].push({ color, status: r.completion_status });
  }
  return map;
}

/** Fetch sub-item completions for a habit on a specific date */
export async function fetchSubStatuses(
  habitId: string,
  localDate: string,
): Promise<Record<string, boolean>> {
  const { data: rec, error: recErr } = await supabase
    .from("completion_records")
    .select("id")
    .eq("habit_id", habitId)
    .eq("local_date", localDate)
    .maybeSingle();

  logError("fetchSubStatuses:record", recErr);
  if (!rec) return {};

  const { data: subs, error: subsErr } = await supabase
    .from("sub_item_completions")
    .select("checklist_item_id, is_done")
    .eq("completion_record_id", rec.id);

  logError("fetchSubStatuses:subs", subsErr);

  const map: Record<string, boolean> = {};
  for (const s of subs ?? []) {
    map[s.checklist_item_id] = s.is_done;
  }
  return map;
}

/** Fetch streak and completion rate for a single habit (last 60 days of history). */
export async function fetchHabitStats(
  habitId: string,
  today: string,
): Promise<{ streak: number; completionRate: number }> {
  // Cap history window; streaks beyond 60 days are rare and cheaper to special-case.
  const windowStart = addDays(today, -60);

  const { data: rows, error } = await supabase
    .from("completion_records")
    .select("local_date, completion_status")
    .eq("habit_id", habitId)
    .gte("local_date", windowStart)
    .order("local_date", { ascending: false });

  logError("fetchHabitStats", error);

  const allRows = rows ?? [];

  // Streak: count consecutive 'done' days ending today (local-time arithmetic).
  const doneSet = new Set(
    allRows
      .filter((r) => r.completion_status === "done")
      .map((r) => r.local_date),
  );

  let streak = 0;
  let checkDate = today;
  while (doneSet.has(checkDate)) {
    streak++;
    checkDate = addDays(checkDate, -1);
  }

  // Completion rate: last 30 days.
  const cutoff = addDays(today, -30);
  const recentRows = allRows.filter((r) => r.local_date >= cutoff);
  const totalDays = recentRows.length || 1;
  const doneDays = recentRows.filter(
    (r) => r.completion_status === "done",
  ).length;
  const completionRate = Math.round((doneDays / totalDays) * 100);

  return { streak, completionRate };
}
