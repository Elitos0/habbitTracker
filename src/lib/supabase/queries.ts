/**
 * Shared Supabase data-fetching helpers used by screens
 * that need direct DB access beyond the Zustand store.
 */
import { supabase } from "@/src/lib/supabase/client";

/** Fetch completion records for a specific habit in a date range */
export async function fetchHabitCompletions(
  habitId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, string>> {
  const { data } = (await supabase
    .from("completion_records")
    .select("local_date, completion_status")
    .eq("habit_id", habitId)
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .neq("completion_status", "none")) as {
    data: { local_date: string; completion_status: string }[] | null;
  };

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
  const { data } = (await supabase
    .from("completion_records")
    .select("local_date, completion_status, habits(color)")
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .neq("completion_status", "none")
    .order("local_date")) as {
    data:
      | {
          local_date: string;
          completion_status: string;
          habits: { color: string } | null;
        }[]
      | null;
  };

  const map: Record<string, { color: string; status: string }[]> = {};
  for (const r of data ?? []) {
    const date = r.local_date;
    const color = r.habits?.color ?? "#888";
    if (!map[date]) map[date] = [];
    map[date].push({ color, status: r.completion_status });
  }
  return map;
}

/** Fetch sub-item completions for a habit on a specific date */
export async function fetchSubStatuses(
  habitId: string,
  localDate: string,
): Promise<Record<string, boolean>> {
  const { data: rec } = (await supabase
    .from("completion_records")
    .select("id")
    .eq("habit_id", habitId)
    .eq("local_date", localDate)
    .maybeSingle()) as { data: { id: string } | null };

  if (!rec) return {};

  const { data: subs } = (await supabase
    .from("sub_item_completions")
    .select("checklist_item_id, is_done")
    .eq("completion_record_id", rec.id)) as {
    data: { checklist_item_id: string; is_done: boolean }[] | null;
  };

  const map: Record<string, boolean> = {};
  for (const s of subs ?? []) {
    map[s.checklist_item_id] = s.is_done;
  }
  return map;
}

/** Fetch streak and completion rate for a single habit */
export async function fetchHabitStats(
  habitId: string,
  today: string,
): Promise<{ streak: number; completionRate: number }> {
  const { data: rows } = (await supabase
    .from("completion_records")
    .select("local_date, completion_status")
    .eq("habit_id", habitId)
    .order("local_date", { ascending: false })) as {
    data: { local_date: string; completion_status: string }[] | null;
  };

  const allRows = rows ?? [];

  // Streak: count consecutive 'done' days ending today
  const doneSet = new Set(
    allRows
      .filter((r) => r.completion_status === "done")
      .map((r) => r.local_date),
  );

  let streak = 0;
  let checkDate = today;
  while (doneSet.has(checkDate)) {
    streak++;
    const d = new Date(checkDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().slice(0, 10);
  }

  // Completion rate: last 30 days
  const thirtyDaysAgo = new Date(today + "T00:00:00");
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const recentRows = allRows.filter((r) => r.local_date >= cutoff);
  const totalDays = recentRows.length || 1;
  const doneDays = recentRows.filter(
    (r) => r.completion_status === "done",
  ).length;
  const completionRate = Math.round((doneDays / totalDays) * 100);

  return { streak, completionRate };
}
