import type {
    HabitChecklistItem,
    HabitSchedule,
    HabitWithDetails,
    Tag,
} from "@/src/domain/habits";
import { computeCompletionStatus } from "@/src/domain/schedule";
import { getLocalToday } from "@/src/lib/date/localDay";
import { supabase } from "@/src/lib/supabase/client";
import type { Database } from "@/src/lib/supabase/types";
import { create } from "zustand";

// Row types for type safety
type TagRow = Database["public"]["Tables"]["tags"]["Row"];
type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type HabitTagRow = Database["public"]["Tables"]["habit_tags"]["Row"];
type ScheduleRow = Database["public"]["Tables"]["habit_schedules"]["Row"];
type ChecklistRow =
  Database["public"]["Tables"]["habit_checklist_items"]["Row"];
type CompletionRow = Database["public"]["Tables"]["completion_records"]["Row"];
type SubCompletionRow =
  Database["public"]["Tables"]["sub_item_completions"]["Row"];

type HabitMutationParams = {
  title: string;
  description?: string;
  color: string;
  tagIds: string[];
  scheduledTime?: string;
  schedule: {
    scheduleType: string;
    weekdays?: number[];
    intervalDays?: number;
    timesPerDay?: number;
  };
  checklistItems?: {
    id?: string;
    label: string;
    slotType?: HabitChecklistItem["slotType"];
    scheduledTime?: string;
    isRequired: boolean;
  }[];
};

interface HabitsState {
  habits: HabitWithDetails[];
  tags: Tag[];
  isLoading: boolean;
  loadAll: () => Promise<void>;
  addHabit: (params: HabitMutationParams) => Promise<string>;
  updateHabit: (habitId: string, params: HabitMutationParams) => Promise<void>;
  toggleSimpleCompletion: (habitId: string, localDate: string) => Promise<void>;
  toggleSubItem: (
    habitId: string,
    checklistItemId: string,
    localDate: string,
  ) => Promise<void>;
  addTag: (name: string, color?: string) => Promise<string>;
  archiveHabit: (habitId: string) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
}

async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  tags: [],
  isLoading: true,

  loadAll: async () => {
    const userId = await getUserId();
    const today = getLocalToday();

    // Load tags
    const { data: tagRows } = (await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name")) as { data: TagRow[] | null };

    const tags: Tag[] = (tagRows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color ?? undefined,
      createdAt: r.created_at,
    }));

    // Load habits with all related data in fewer queries
    const { data: habitRows } = (await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("sort_order")
      .order("created_at", { ascending: false })) as {
      data: HabitRow[] | null;
    };

    if (!habitRows || habitRows.length === 0) {
      set({ habits: [], tags, isLoading: false });
      return;
    }

    const habitIds = habitRows.map((h) => h.id);

    // Batch load all related data
    const [htResult, schedResult, clResult, compResult] = await Promise.all([
      supabase.from("habit_tags").select("*").in("habit_id", habitIds) as any,
      supabase
        .from("habit_schedules")
        .select("*")
        .in("habit_id", habitIds)
        .eq("active", true) as any,
      supabase
        .from("habit_checklist_items")
        .select("*")
        .in("habit_id", habitIds)
        .order("sort_order") as any,
      supabase
        .from("completion_records")
        .select("*")
        .in("habit_id", habitIds)
        .eq("local_date", today) as any,
    ]);

    const htRows: HabitTagRow[] = htResult.data ?? [];
    const schedRows: ScheduleRow[] = schedResult.data ?? [];
    const clRows: ChecklistRow[] = clResult.data ?? [];
    const compRows: CompletionRow[] = compResult.data ?? [];

    // Load sub-item completions for today's records
    const compIds = compRows.map((c) => c.id);
    let subRows: any[] = [];
    if (compIds.length > 0) {
      const { data } = await supabase
        .from("sub_item_completions")
        .select("*")
        .in("completion_record_id", compIds);
      subRows = data ?? [];
    }

    // Build habits
    const habits: HabitWithDetails[] = habitRows.map((h) => {
      const habitTags = tags.filter((t) =>
        htRows.some((ht) => ht.habit_id === h.id && ht.tag_id === t.id),
      );

      const schedRow = schedRows.find((s) => s.habit_id === h.id);
      const schedule: HabitSchedule | null = schedRow
        ? {
            id: schedRow.id,
            habitId: schedRow.habit_id,
            scheduleType:
              schedRow.schedule_type as HabitSchedule["scheduleType"],
            intervalDays: schedRow.interval_days ?? undefined,
            weekdays: schedRow.weekdays ?? undefined,
            startDate: schedRow.start_date,
            endDate: schedRow.end_date ?? undefined,
            timesPerDay: schedRow.times_per_day,
            active: schedRow.active,
          }
        : null;

      const checklistItems: HabitChecklistItem[] = clRows
        .filter((c) => c.habit_id === h.id)
        .map((c) => ({
          id: c.id,
          habitId: c.habit_id,
          label: c.label,
          slotType:
            (c.slot_type as HabitChecklistItem["slotType"]) ?? undefined,
          scheduledTime: c.scheduled_time ?? undefined,
          isRequired: c.is_required,
          sortOrder: c.sort_order,
        }));

      const compRow = compRows.find((c) => c.habit_id === h.id);
      let todayStatus: "none" | "partial" | "done" = "none";
      let todaySubStatuses: Record<string, boolean> | undefined;

      if (compRow) {
        if (checklistItems.length > 0) {
          const subs = subRows.filter(
            (s) => s.completion_record_id === compRow.id,
          );
          todayStatus = computeCompletionStatus(
            checklistItems,
            subs.map((s) => ({
              id: s.id,
              completionRecordId: s.completion_record_id,
              checklistItemId: s.checklist_item_id,
              isDone: s.is_done,
              completedAt: s.completed_at ?? undefined,
            })),
          );
          todaySubStatuses = {};
          for (const s of subs) {
            todaySubStatuses[s.checklist_item_id] = s.is_done;
          }
        } else {
          todayStatus = compRow.completion_status as any;
        }
      }

      return {
        id: h.id,
        title: h.title,
        description: h.description ?? undefined,
        color: h.color,
        icon: h.icon ?? undefined,
        isArchived: h.is_archived,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
        sortOrder: h.sort_order,
        tags: habitTags,
        schedule,
        checklistItems,
        todayStatus,
        todaySubStatuses,
        scheduledTime: h.scheduled_time ?? undefined,
      };
    });

    set({ habits, tags, isLoading: false });
  },

  addHabit: async (params) => {
    const userId = await getUserId();
    const today = getLocalToday();

    // Insert habit
    const { data: habit, error } = (await (supabase.from("habits") as any)
      .insert({
        user_id: userId,
        title: params.title,
        description: params.description ?? null,
        color: params.color,
        scheduled_time: params.scheduledTime ?? null,
        sort_order: 0,
      })
      .select("id")
      .single()) as { data: { id: string } | null; error: any };

    if (error || !habit) throw error ?? new Error("Failed to create habit");
    const id = habit.id;

    // Tags
    if (params.tagIds.length > 0) {
      await (supabase.from("habit_tags") as any).insert(
        params.tagIds.map((tagId) => ({ habit_id: id, tag_id: tagId })),
      );
    }

    // Schedule
    await (supabase.from("habit_schedules") as any).insert({
      habit_id: id,
      schedule_type: params.schedule.scheduleType,
      interval_days: params.schedule.intervalDays ?? null,
      weekdays: params.schedule.weekdays
        ? JSON.stringify(params.schedule.weekdays)
        : null,
      start_date: today,
      times_per_day: params.schedule.timesPerDay ?? 1,
      active: true,
    });

    // Checklist items
    if (params.checklistItems && params.checklistItems.length > 0) {
      await (supabase.from("habit_checklist_items") as any).insert(
        params.checklistItems.map((item, i) => ({
          habit_id: id,
          label: item.label,
          slot_type: item.slotType ?? null,
          scheduled_time: item.scheduledTime ?? null,
          is_required: item.isRequired,
          sort_order: i,
        })),
      );
    }

    await get().loadAll();
    return id;
  },

  updateHabit: async (habitId, params) => {
    const today = getLocalToday();
    const now = new Date().toISOString();

    const { data: currentSchedule } = (await supabase
      .from("habit_schedules")
      .select("start_date")
      .eq("habit_id", habitId)
      .eq("active", true)
      .maybeSingle()) as { data: Pick<ScheduleRow, "start_date"> | null };

    await (supabase.from("habits") as any)
      .update({
        title: params.title,
        description: params.description ?? null,
        color: params.color,
        scheduled_time: params.scheduledTime ?? null,
        updated_at: now,
      })
      .eq("id", habitId);

    await (supabase.from("habit_tags") as any)
      .delete()
      .eq("habit_id", habitId);

    if (params.tagIds.length > 0) {
      await (supabase.from("habit_tags") as any).insert(
        params.tagIds.map((tagId) => ({ habit_id: habitId, tag_id: tagId })),
      );
    }

    await (supabase.from("habit_schedules") as any)
      .update({ active: false })
      .eq("habit_id", habitId)
      .eq("active", true);

    await (supabase.from("habit_schedules") as any).insert({
      habit_id: habitId,
      schedule_type: params.schedule.scheduleType,
      interval_days: params.schedule.intervalDays ?? null,
      weekdays: params.schedule.weekdays
        ? JSON.stringify(params.schedule.weekdays)
        : null,
      start_date: currentSchedule?.start_date ?? today,
      times_per_day: params.schedule.timesPerDay ?? 1,
      active: true,
    });

    const incomingItems = params.checklistItems ?? [];
    const { data: existingItems } = (await supabase
      .from("habit_checklist_items")
      .select("*")
      .eq("habit_id", habitId)) as { data: ChecklistRow[] | null };

    const incomingIds = new Set(
      incomingItems.map((item) => item.id).filter(Boolean),
    );
    const removedIds = (existingItems ?? [])
      .filter((item) => !incomingIds.has(item.id))
      .map((item) => item.id);

    if (removedIds.length > 0) {
      await (supabase.from("habit_checklist_items") as any)
        .delete()
        .in("id", removedIds);
    }

    for (const [sortOrder, item] of incomingItems.entries()) {
      const payload = {
        label: item.label,
        slot_type: item.slotType ?? null,
        scheduled_time: item.scheduledTime ?? null,
        is_required: item.isRequired,
        sort_order: sortOrder,
      };

      if (item.id) {
        await (supabase.from("habit_checklist_items") as any)
          .update(payload)
          .eq("id", item.id)
          .eq("habit_id", habitId);
      } else {
        await (supabase.from("habit_checklist_items") as any).insert({
          habit_id: habitId,
          ...payload,
        });
      }
    }

    await get().loadAll();
  },

  toggleSimpleCompletion: async (habitId, localDate) => {
    const now = new Date().toISOString();

    // Check existing
    const { data: existing } = (await supabase
      .from("completion_records")
      .select("*")
      .eq("habit_id", habitId)
      .eq("local_date", localDate)
      .maybeSingle()) as { data: CompletionRow | null };

    if (existing) {
      const newStatus = existing.completion_status === "done" ? "none" : "done";
      await (supabase.from("completion_records") as any)
        .update({ completion_status: newStatus, updated_at: now })
        .eq("id", existing.id);
    } else {
      await (supabase.from("completion_records") as any).insert({
        habit_id: habitId,
        local_date: localDate,
        completion_status: "done",
      });
    }

    await get().loadAll();
  },

  toggleSubItem: async (habitId, checklistItemId, localDate) => {
    const now = new Date().toISOString();

    // Ensure a completion record exists
    let { data: record } = (await supabase
      .from("completion_records")
      .select("*")
      .eq("habit_id", habitId)
      .eq("local_date", localDate)
      .maybeSingle()) as { data: CompletionRow | null };

    if (!record) {
      const { data: newRec } = (await (
        supabase.from("completion_records") as any
      )
        .insert({
          habit_id: habitId,
          local_date: localDate,
          completion_status: "none",
        })
        .select("*")
        .single()) as { data: CompletionRow | null };
      record = newRec;
    }
    if (!record) throw new Error("Failed to create completion record");

    // Toggle sub-item
    const { data: sub } = (await supabase
      .from("sub_item_completions")
      .select("*")
      .eq("completion_record_id", record.id)
      .eq("checklist_item_id", checklistItemId)
      .maybeSingle()) as { data: SubCompletionRow | null };

    if (sub) {
      await (supabase.from("sub_item_completions") as any)
        .update({
          is_done: !sub.is_done,
          completed_at: sub.is_done ? null : now,
        })
        .eq("id", sub.id);
    } else {
      await (supabase.from("sub_item_completions") as any).insert({
        completion_record_id: record.id,
        checklist_item_id: checklistItemId,
        is_done: true,
        completed_at: now,
      });
    }

    // Recompute completion status
    const habit = get().habits.find((h) => h.id === habitId);
    if (habit) {
      const { data: allSubs } = (await supabase
        .from("sub_item_completions")
        .select("*")
        .eq("completion_record_id", record.id)) as {
        data: SubCompletionRow[] | null;
      };

      const status = computeCompletionStatus(
        habit.checklistItems,
        (allSubs ?? []).map((s) => ({
          id: s.id,
          completionRecordId: s.completion_record_id,
          checklistItemId: s.checklist_item_id,
          isDone: s.is_done,
          completedAt: s.completed_at ?? undefined,
        })),
      );
      await (supabase.from("completion_records") as any)
        .update({ completion_status: status, updated_at: now })
        .eq("id", record.id);
    }

    await get().loadAll();
  },

  addTag: async (name, color) => {
    const userId = await getUserId();

    const { data, error } = (await (supabase.from("tags") as any)
      .insert({ user_id: userId, name, color: color ?? null })
      .select("id")
      .single()) as { data: { id: string } | null; error: any };

    if (error || !data) throw error ?? new Error("Failed to create tag");

    await get().loadAll();
    return data.id;
  },

  archiveHabit: async (habitId) => {
    await (supabase.from("habits") as any)
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", habitId);

    await get().loadAll();
  },

  deleteHabit: async (habitId) => {
    await (supabase.from("habits") as any).delete().eq("id", habitId);

    await get().loadAll();
  },
}));
