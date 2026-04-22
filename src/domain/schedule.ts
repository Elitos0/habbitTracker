import { daysBetween, getDayOfWeek } from "../lib/date/localDay";
import type {
  CompletionStatus,
  HabitChecklistItem,
  HabitSchedule,
  SubItemCompletion,
} from "./habits";

/**
 * Safely parse a weekdays JSON string into an array of day-of-week ints (0-6).
 * Returns [] on malformed input rather than throwing.
 */
export function parseWeekdays(value: string | undefined | null): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (day): day is number =>
        Number.isInteger(day) && day >= 0 && day <= 6,
    );
  } catch {
    return [];
  }
}

/**
 * Determine if a habit is expected on a given local date
 * based on its schedule rules.
 */
export function isHabitExpectedOnDate(
  schedule: HabitSchedule | null,
  localDate: string,
): boolean {
  if (!schedule || !schedule.active) return false;

  // Not started yet
  if (localDate < schedule.startDate) return false;
  // Ended
  if (schedule.endDate && localDate > schedule.endDate) return false;

  switch (schedule.scheduleType) {
    case "daily":
      return true;

    case "weekdays": {
      const weekdays = parseWeekdays(schedule.weekdays);
      return weekdays.includes(getDayOfWeek(localDate));
    }

    case "interval": {
      const interval = schedule.intervalDays ?? 1;
      const diff = daysBetween(schedule.startDate, localDate);
      return diff >= 0 && diff % interval === 0;
    }

    case "times_per_day":
      // times_per_day is essentially daily, the "times" part is
      // handled by checklist items, not by skipping dates
      return true;

    default:
      return false;
  }
}

/**
 * Compute the completion status for a compound habit based on
 * its required checklist items.
 *
 * Simple habits (no checklist items) are always 'done' or 'none'.
 */
export function computeCompletionStatus(
  checklistItems: HabitChecklistItem[],
  subItemCompletions: SubItemCompletion[],
): CompletionStatus {
  if (checklistItems.length === 0) return "none";

  const requiredItems = checklistItems.filter((item) => item.isRequired);
  if (requiredItems.length === 0) {
    // All optional — done if any one is done
    const anyDone = subItemCompletions.some((c) => c.isDone);
    return anyDone ? "done" : "none";
  }

  const doneIds = new Set(
    subItemCompletions.filter((c) => c.isDone).map((c) => c.checklistItemId),
  );

  const requiredDone = requiredItems.filter((item) => doneIds.has(item.id));

  if (requiredDone.length === requiredItems.length) return "done";
  if (requiredDone.length > 0) return "partial";
  // Check if any optional items are done
  const anyDone = subItemCompletions.some((c) => c.isDone);
  return anyDone ? "partial" : "none";
}
