import { z } from "zod";

// ─── Schedule Types ───

export const ScheduleType = z.enum([
  "daily",
  "weekdays",
  "interval",
  "times_per_day",
]);
export type ScheduleType = z.infer<typeof ScheduleType>;

// ─── Checklist Slot Types ───

export const SlotType = z.enum(["morning", "afternoon", "evening", "custom"]);
export type SlotType = z.infer<typeof SlotType>;

// ─── Completion Status ───

export const CompletionStatus = z.enum(["none", "partial", "done"]);
export type CompletionStatus = z.infer<typeof CompletionStatus>;

// ─── Reminder Channel ───

export const ReminderChannel = z.enum(["android", "browser"]);
export type ReminderChannel = z.infer<typeof ReminderChannel>;

// ─── Reminder Trigger ───

export const ReminderTrigger = z.enum(["daily", "weekly", "interval"]);
export type ReminderTrigger = z.infer<typeof ReminderTrigger>;

// ─── Core Entities ───

const TimeOfDayRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const HabitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().optional(),
  scheduledTime: z.string().regex(TimeOfDayRegex).optional(),
  isArchived: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sortOrder: z.number().int().min(0),
});
export type Habit = z.infer<typeof HabitSchema>;

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  createdAt: z.string().datetime(),
});
export type Tag = z.infer<typeof TagSchema>;

export const HabitTagSchema = z.object({
  habitId: z.string().uuid(),
  tagId: z.string().uuid(),
});
export type HabitTag = z.infer<typeof HabitTagSchema>;

export const HabitScheduleSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  scheduleType: ScheduleType,
  intervalDays: z.number().int().min(1).optional(),
  weekdays: z.string().optional(), // JSON array of 0-6
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string().optional(),
  timesPerDay: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
});
export type HabitSchedule = z.infer<typeof HabitScheduleSchema>;

export const HabitChecklistItemSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  label: z.string().min(1).max(100),
  slotType: SlotType.optional(),
  scheduledTime: z.string().regex(TimeOfDayRegex).optional(),
  isRequired: z.boolean().default(true),
  sortOrder: z.number().int().min(0),
});
export type HabitChecklistItem = z.infer<typeof HabitChecklistItemSchema>;

export const CompletionRecordSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  localDate: z.string(), // YYYY-MM-DD
  completionStatus: CompletionStatus,
  note: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CompletionRecord = z.infer<typeof CompletionRecordSchema>;

export const SubItemCompletionSchema = z.object({
  id: z.string().uuid(),
  completionRecordId: z.string().uuid(),
  checklistItemId: z.string().uuid(),
  isDone: z.boolean().default(false),
  completedAt: z.string().datetime().optional(),
});
export type SubItemCompletion = z.infer<typeof SubItemCompletionSchema>;

export const ReminderRuleSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  channelType: ReminderChannel,
  triggerType: ReminderTrigger,
  timeOfDay: z.string().regex(TimeOfDayRegex),
  weekday: z.number().int().min(0).max(6).optional(),
  intervalDays: z.number().int().min(1).optional(),
  enabled: z.boolean().default(true),
});
export type ReminderRule = z.infer<typeof ReminderRuleSchema>;

// ─── Backup ───

export const BackupSchema = z.object({
  schemaVersion: z.number().int(),
  exportedAt: z.string().datetime(),
  appVersion: z.string(),
  habits: z.array(HabitSchema),
  tags: z.array(TagSchema),
  habitTags: z.array(HabitTagSchema),
  schedules: z.array(HabitScheduleSchema),
  checklistItems: z.array(HabitChecklistItemSchema),
  completionRecords: z.array(CompletionRecordSchema),
  subItemCompletions: z.array(SubItemCompletionSchema),
  reminderRules: z.array(ReminderRuleSchema),
});
export type Backup = z.infer<typeof BackupSchema>;

// ─── Derived Types (not stored, computed) ───

export interface HabitWithDetails extends Habit {
  tags: Tag[];
  schedule: HabitSchedule | null;
  checklistItems: HabitChecklistItem[];
  todayStatus: CompletionStatus;
  todaySubStatuses?: Record<string, boolean>;
  scheduledTime?: string;
}
