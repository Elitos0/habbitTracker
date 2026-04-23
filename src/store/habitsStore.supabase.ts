import type {
  HabitChecklistItem,
  HabitSchedule,
  HabitWithDetails,
  ScheduleType,
  Tag,
} from "@/src/domain/habits";
import { computeCompletionStatus } from "@/src/domain/schedule";
import { getLocalToday } from "@/src/lib/date/localDay";
import { supabase } from "@/src/lib/supabase/client";
import type { Database } from "@/src/lib/supabase/types";
import { create } from "zustand";

// Row types for type safety
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
    scheduleType: ScheduleType;
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
  unarchiveHabit: (habitId: string) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  loadArchivedHabits: () => Promise<HabitWithDetails[]>;
}

async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function throwIf<T>(result: { data: T; error: unknown }, context: string): T {
  if (result.error) {
    console.warn(`[habitsStore:${context}]`, result.error);
    throw result.error instanceof Error
      ? result.error
      : new Error(`${context} failed`);
  }
  return result.data;
}

/** Get-or-create a completion record for (habitId, localDate) atomically. */
async function ensureCompletionRecord(
  habitId: string,
  localDate: string,
): Promise<CompletionRow> {
  // Upsert with onConflict on the UNIQUE(habit_id, local_date) constraint
  // gives us read-your-writes semantics without a read-then-insert race.
  const { data, error } = await supabase
    .from("completion_records")
    .upsert(
      {
        habit_id: habitId,
        local_date: localDate,
        completion_status: "none",
      },
      { onConflict: "habit_id,local_date", ignoreDuplicates: false },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to upsert completion record");
  }
  return data as CompletionRow;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  tags: [],
  isLoading: true,

  loadAll: async () => {
    const userId = await getUserId();
    const today = getLocalToday();

    // Load tags
    const tagRows = throwIf(
      await supabase
        .from("tags")
        .select("*")
        .eq("user_id", userId)
        .order("name"),
      "loadAll:tags",
    );

    const tags: Tag[] = (tagRows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color ?? undefined,
      createdAt: r.created_at,
    }));

    // Load habits
    const habitRows = throwIf(
      await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("sort_order")
        .order("created_at", { ascending: false }),
      "loadAll:habits",
    );

    if (!habitRows || habitRows.length === 0) {
      set({ habits: [], tags, isLoading: false });
      return;
    }

    const habitIds = habitRows.map((h) => h.id);

    // Batch load all related data in parallel
    const [htResult, schedResult, clResult, compResult] = await Promise.all([
      supabase.from("habit_tags").select("*").in("habit_id", habitIds),
      supabase
        .from("habit_schedules")
        .select("*")
        .in("habit_id", habitIds)
        .eq("active", true),
      supabase
        .from("habit_checklist_items")
        .select("*")
        .in("habit_id", habitIds)
        .order("sort_order"),
      supabase
        .from("completion_records")
        .select("*")
        .in("habit_id", habitIds)
        .eq("local_date", today),
    ]);

    const htRows = htResult.data ?? [];
    const schedRows = schedResult.data ?? [];
    const clRows = clResult.data ?? [];
    const compRows = compResult.data ?? [];

    // Load sub-item completions for today's records
    const compIds = compRows.map((c) => c.id);
    let subRows: SubCompletionRow[] = [];
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
            scheduleType: schedRow.schedule_type as ScheduleType,
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
          todayStatus =
            (compRow.completion_status as "none" | "partial" | "done") ??
            "none";
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
    const { data: habit, error } = await supabase
      .from("habits")
      .insert({
        user_id: userId,
        title: params.title,
        description: params.description ?? null,
        color: params.color,
        scheduled_time: params.scheduledTime ?? null,
        sort_order: 0,
      })
      .select("id")
      .single();

    if (error || !habit) throw error ?? new Error("Failed to create habit");
    const id = habit.id;

    // Tags
    if (params.tagIds.length > 0) {
      const { error: tagErr } = await supabase
        .from("habit_tags")
        .insert(
          params.tagIds.map((tagId) => ({ habit_id: id, tag_id: tagId })),
        );
      if (tagErr) console.warn("[addHabit:tags]", tagErr);
    }

    // Schedule
    const { error: schedErr } = await supabase.from("habit_schedules").insert({
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
    if (schedErr) console.warn("[addHabit:schedule]", schedErr);

    // Checklist items
    if (params.checklistItems && params.checklistItems.length > 0) {
      const { error: clErr } = await supabase
        .from("habit_checklist_items")
        .insert(
          params.checklistItems.map((item, i) => ({
            habit_id: id,
            label: item.label,
            slot_type: item.slotType ?? null,
            scheduled_time: item.scheduledTime ?? null,
            is_required: item.isRequired,
            sort_order: i,
          })),
        );
      if (clErr) console.warn("[addHabit:checklist]", clErr);
    }

    await get().loadAll();
    return id;
  },

  updateHabit: async (habitId, params) => {
    const today = getLocalToday();
    const now = new Date().toISOString();

    const { data: currentSchedule } = await supabase
      .from("habit_schedules")
      .select("id, start_date")
      .eq("habit_id", habitId)
      .eq("active", true)
      .maybeSingle();

    const { error: habitErr } = await supabase
      .from("habits")
      .update({
        title: params.title,
        description: params.description ?? null,
        color: params.color,
        scheduled_time: params.scheduledTime ?? null,
        updated_at: now,
      })
      .eq("id", habitId);
    if (habitErr) console.warn("[updateHabit:habit]", habitErr);

    // Replace tags (delete + insert). Small N so a full replace is fine.
    await supabase.from("habit_tags").delete().eq("habit_id", habitId);

    if (params.tagIds.length > 0) {
      const { error: tagErr } = await supabase
        .from("habit_tags")
        .insert(
          params.tagIds.map((tagId) => ({ habit_id: habitId, tag_id: tagId })),
        );
      if (tagErr) console.warn("[updateHabit:tags]", tagErr);
    }

    // Update schedule in place when one already exists — don't version on
    // every save (avoids O(edits) rows in habit_schedules per habit).
    const schedulePayload = {
      schedule_type: params.schedule.scheduleType,
      interval_days: params.schedule.intervalDays ?? null,
      weekdays: params.schedule.weekdays
        ? JSON.stringify(params.schedule.weekdays)
        : null,
      times_per_day: params.schedule.timesPerDay ?? 1,
      active: true,
    };

    if (currentSchedule) {
      const { error: schedErr } = await supabase
        .from("habit_schedules")
        .update(schedulePayload)
        .eq("id", currentSchedule.id);
      if (schedErr) console.warn("[updateHabit:schedule]", schedErr);
    } else {
      const { error: schedErr } = await supabase
        .from("habit_schedules")
        .insert({
          habit_id: habitId,
          ...schedulePayload,
          start_date: today,
        });
      if (schedErr) console.warn("[updateHabit:schedule:insert]", schedErr);
    }

    const incomingItems = params.checklistItems ?? [];
    const { data: existingItems } = await supabase
      .from("habit_checklist_items")
      .select("*")
      .eq("habit_id", habitId);

    const incomingIds = new Set(
      incomingItems
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id)),
    );
    const removedIds = ((existingItems ?? []) as ChecklistRow[])
      .filter((item) => !incomingIds.has(item.id))
      .map((item) => item.id);

    if (removedIds.length > 0) {
      await supabase
        .from("habit_checklist_items")
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
        await supabase
          .from("habit_checklist_items")
          .update(payload)
          .eq("id", item.id)
          .eq("habit_id", habitId);
      } else {
        await supabase
          .from("habit_checklist_items")
          .insert({ habit_id: habitId, ...payload });
      }
    }

    await get().loadAll();
  },

  toggleSimpleCompletion: async (habitId, localDate) => {
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("completion_records")
      .select("id, completion_status")
      .eq("habit_id", habitId)
      .eq("local_date", localDate)
      .maybeSingle();

    if (existing) {
      const newStatus = existing.completion_status === "done" ? "none" : "done";
      const { error } = await supabase
        .from("completion_records")
        .update({ completion_status: newStatus, updated_at: now })
        .eq("id", existing.id);
      if (error) console.warn("[toggleSimpleCompletion:update]", error);
    } else {
      const { error } = await supabase.from("completion_records").insert({
        habit_id: habitId,
        local_date: localDate,
        completion_status: "done",
      });
      if (error) console.warn("[toggleSimpleCompletion:insert]", error);
    }

    await get().loadAll();
  },

  toggleSubItem: async (habitId, checklistItemId, localDate) => {
    const now = new Date().toISOString();

    // Upsert the completion record — safe under concurrent taps.
    const record = await ensureCompletionRecord(habitId, localDate);

    // Toggle sub-item
    const { data: sub } = await supabase
      .from("sub_item_completions")
      .select("id, is_done")
      .eq("completion_record_id", record.id)
      .eq("checklist_item_id", checklistItemId)
      .maybeSingle();

    if (sub) {
      const { error } = await supabase
        .from("sub_item_completions")
        .update({
          is_done: !sub.is_done,
          completed_at: sub.is_done ? null : now,
        })
        .eq("id", sub.id);
      if (error) console.warn("[toggleSubItem:update]", error);
    } else {
      const { error } = await supabase.from("sub_item_completions").insert({
        completion_record_id: record.id,
        checklist_item_id: checklistItemId,
        is_done: true,
        completed_at: now,
      });
      if (error) console.warn("[toggleSubItem:insert]", error);
    }

    // Recompute completion status
    const habit = get().habits.find((h) => h.id === habitId);
    if (habit) {
      const { data: allSubs } = await supabase
        .from("sub_item_completions")
        .select("*")
        .eq("completion_record_id", record.id);

      const status = computeCompletionStatus(
        habit.checklistItems,
        ((allSubs ?? []) as SubCompletionRow[]).map((s) => ({
          id: s.id,
          completionRecordId: s.completion_record_id,
          checklistItemId: s.checklist_item_id,
          isDone: s.is_done,
          completedAt: s.completed_at ?? undefined,
        })),
      );
      const { error } = await supabase
        .from("completion_records")
        .update({ completion_status: status, updated_at: now })
        .eq("id", record.id);
      if (error) console.warn("[toggleSubItem:recompute]", error);
    }

    await get().loadAll();
  },

  addTag: async (name, color) => {
    const userId = await getUserId();

    // Idempotent: if a tag with this name already exists for the user,
    // return its id instead of failing on the UNIQUE(user_id, name) index.
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", userId)
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      await get().loadAll();
      return existing.id;
    }

    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: userId, name, color: color ?? null })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Failed to create tag");

    await get().loadAll();
    return data.id;
  },

  archiveHabit: async (habitId) => {
    const { error } = await supabase
      .from("habits")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", habitId);
    if (error) console.warn("[archiveHabit]", error);

    await get().loadAll();
  },

  unarchiveHabit: async (habitId) => {
    const { error } = await supabase
      .from("habits")
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq("id", habitId);
    if (error) console.warn("[unarchiveHabit]", error);

    await get().loadAll();
  },

  deleteHabit: async (habitId) => {
    const { error } = await supabase.from("habits").delete().eq("id", habitId);
    if (error) console.warn("[deleteHabit]", error);

    await get().loadAll();
  },

  loadArchivedHabits: async () => {
    const userId = await getUserId();

    const { data: habitRows, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[loadArchivedHabits]", error);
      return [];
    }
    if (!habitRows || habitRows.length === 0) return [];

    const habitIds = habitRows.map((h) => h.id);

    const [htResult, schedResult, tagsResult] = await Promise.all([
      supabase.from("habit_tags").select("*").in("habit_id", habitIds),
      supabase
        .from("habit_schedules")
        .select("*")
        .in("habit_id", habitIds)
        .eq("active", true),
      supabase.from("tags").select("*").eq("user_id", userId),
    ]);

    const htRows = htResult.data ?? [];
    const schedRows = schedResult.data ?? [];
    const allTags: Tag[] = (tagsResult.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color ?? undefined,
      createdAt: r.created_at,
    }));

    return habitRows.map((h) => {
      const habitTags = allTags.filter((t) =>
        htRows.some((ht) => ht.habit_id === h.id && ht.tag_id === t.id),
      );
      const schedRow = schedRows.find((s) => s.habit_id === h.id);
      const schedule: HabitSchedule | null = schedRow
        ? {
            id: schedRow.id,
            habitId: schedRow.habit_id,
            scheduleType: schedRow.schedule_type as ScheduleType,
            intervalDays: schedRow.interval_days ?? undefined,
            weekdays: schedRow.weekdays ?? undefined,
            startDate: schedRow.start_date,
            endDate: schedRow.end_date ?? undefined,
            timesPerDay: schedRow.times_per_day,
            active: schedRow.active,
          }
        : null;

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
        schedule,
        scheduledTime: h.scheduled_time ?? undefined,
        tags: habitTags,
        checklistItems: [],
        todayStatus: "none" as const,
      };
    });
  },
}));
