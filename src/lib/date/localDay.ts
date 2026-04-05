/**
 * Local day utilities for timezone-safe date handling.
 *
 * All habit completions, streaks, and calendar views work in the
 * user's local timezone. We never compare naive UTC dates.
 */

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function getLocalToday(tz?: string): string {
  const now = new Date();
  if (tz) {
    return now.toLocaleDateString("sv-SE", { timeZone: tz }); // sv-SE gives YYYY-MM-DD
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function parseLocalDate(localDate: string): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD in local time. */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add N days to a local date string. */
export function addDays(localDate: string, days: number): string {
  const date = parseLocalDate(localDate);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/** Get the day-of-week (0=Sun, 6=Sat) for a local date string. */
export function getDayOfWeek(localDate: string): number {
  return parseLocalDate(localDate).getDay();
}

/** Get all dates in a month as YYYY-MM-DD strings. */
export function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return dates;
}

/** Calculate the number of days between two local date strings. */
export function daysBetween(a: string, b: string): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}
