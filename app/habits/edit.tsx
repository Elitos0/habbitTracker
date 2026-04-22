import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import TimePickerField from "@/components/TimePickerField";
import { useColorScheme } from "@/components/useColorScheme";
import {
  Colors,
  FontSize,
  HABIT_COLORS,
  Radius,
  Spacing,
} from "@/constants/theme";
import type {
  HabitChecklistItem,
  ScheduleType,
} from "@/src/domain/habits";
import { parseWeekdays as parseWeekdaysJson } from "@/src/domain/schedule";
import { useHabitsStore } from "@/src/store/habitsStore";

const SCHEDULE_OPTIONS: { key: ScheduleType; label: string }[] = [
  { key: "daily", label: "Каждый день" },
  { key: "weekdays", label: "По дням недели" },
  { key: "interval", label: "Каждые N дней" },
  { key: "times_per_day", label: "Несколько раз в день" },
];

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAY_JS = [1, 2, 3, 4, 5, 6, 0];

type ChecklistDraft = {
  id?: string;
  label: string;
  scheduledTime: string;
  slotType?: HabitChecklistItem["slotType"];
  isRequired: boolean;
};

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
function normalizeTime(text: string): string | undefined {
  return TIME_RE.test(text) ? text : undefined;
}

function clampInt(text: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(text, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function initialWeekdays(value?: string): number[] {
  const parsed = parseWeekdaysJson(value);
  return parsed.length > 0 ? parsed : [1, 2, 3, 4, 5];
}

function confirmDestructive(
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(message)) onConfirm();
    return;
  }

  Alert.alert("Подтверждение", message, [
    { text: "Отмена", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const {
    habits,
    tags,
    loadAll,
    updateHabit,
    archiveHabit,
    deleteHabit,
    addTag,
  } = useHabitsStore();

  const habit = habits.find((item) => item.id === id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(HABIT_COLORS[4]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [intervalDays, setIntervalDays] = useState("2");
  const [timesPerDay, setTimesPerDay] = useState("3");
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistDraft[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!habit) return;

    setTitle(habit.title);
    setDescription(habit.description ?? "");
    setColor(habit.color);
    setSelectedTagIds(habit.tags.map((tag) => tag.id));
    setScheduledTime(habit.scheduledTime ?? "");
    setScheduleType(habit.schedule?.scheduleType ?? "daily");
    setSelectedWeekdays(initialWeekdays(habit.schedule?.weekdays));
    setIntervalDays(String(habit.schedule?.intervalDays ?? 2));
    setTimesPerDay(String(habit.schedule?.timesPerDay ?? 3));
    setHasChecklist(habit.checklistItems.length > 0);
    setChecklistItems(
      habit.checklistItems.map((item) => ({
        id: item.id,
        label: item.label,
        scheduledTime: item.scheduledTime ?? "",
        slotType: item.slotType,
        isRequired: item.isRequired,
      })),
    );
  }, [habit?.id]);

  const toggleWeekday = (jsDay: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(jsDay) ? prev.filter((day) => day !== jsDay) : [...prev, jsDay],
    );
  };

  const handleSave = async () => {
    if (!habit || !title.trim()) return;
    setSaving(true);

    const schedule: {
      scheduleType: ScheduleType;
      weekdays?: number[];
      intervalDays?: number;
      timesPerDay?: number;
    } = { scheduleType };
    if (scheduleType === "weekdays") schedule.weekdays = selectedWeekdays;
    if (scheduleType === "interval")
      schedule.intervalDays = clampInt(intervalDays, 1, 365, 2);
    if (scheduleType === "times_per_day")
      schedule.timesPerDay = clampInt(timesPerDay, 1, 24, 1);

    const payloadChecklistItems = hasChecklist
      ? checklistItems
          .filter((item) => item.label.trim())
          .map((item) => ({
            id: item.id,
            label: item.label.trim(),
            slotType: item.slotType,
            scheduledTime: normalizeTime(item.scheduledTime),
            isRequired: item.isRequired,
          }))
      : [];

    await updateHabit(habit.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      tagIds: selectedTagIds,
      scheduledTime: normalizeTime(scheduledTime),
      schedule,
      checklistItems: payloadChecklistItems,
    });

    setSaving(false);
    router.replace(`/habits/${habit.id}`);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const tagId = await addTag(newTagName.trim());
    setSelectedTagIds((prev) => [...prev, tagId]);
    setNewTagName("");
  };

  const handleArchive = () => {
    if (!habit) return;
    confirmDestructive(
      "Архивировать привычку? Она исчезнет из списка, но история выполнения сохранится.",
      "Архивировать",
      async () => {
        await archiveHabit(habit.id);
        router.replace("/");
      },
    );
  };

  const handleDelete = () => {
    if (!habit) return;
    confirmDestructive(
      "Удалить привычку навсегда? Это удалит историю, подпункты и статистику без восстановления.",
      "Удалить",
      async () => {
        await deleteHabit(habit.id);
        router.replace("/");
      },
    );
  };

  if (!habit) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Привычка не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.label, { color: colors.text }]}>Название</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={title}
        onChangeText={setTitle}
        placeholder="Например: Выпить воду"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.label, { color: colors.text }]}>Описание</Text>
      <TextInput
        style={[
          styles.input,
          styles.multiline,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={description}
        onChangeText={setDescription}
        placeholder="Необязательно"
        placeholderTextColor={colors.textSecondary}
        multiline
      />

      <Text style={[styles.label, { color: colors.text }]}>Цвет</Text>
      <View style={styles.colorRow}>
        {HABIT_COLORS.map((habitColor) => (
          <Pressable
            key={habitColor}
            onPress={() => setColor(habitColor)}
            style={[
              styles.colorCircle,
              { backgroundColor: habitColor },
              habitColor === color && styles.colorSelected,
            ]}
          >
            {habitColor === color && (
              <FontAwesome name="check" size={14} color="#fff" />
            )}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Теги</Text>
      <View style={styles.tagRow}>
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              onPress={() =>
                setSelectedTagIds((prev) =>
                  isSelected
                    ? prev.filter((tagId) => tagId !== tag.id)
                    : [...prev, tag.id],
                )
              }
              style={[
                styles.tagChip,
                {
                  backgroundColor: isSelected
                    ? (tag.color ?? colors.tint) + "30"
                    : colors.surfaceSecondary,
                  borderColor: isSelected
                    ? (tag.color ?? colors.tint)
                    : "transparent",
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected
                    ? (tag.color ?? colors.tint)
                    : colors.textSecondary,
                  fontSize: FontSize.sm,
                }}
              >
                {tag.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.newTagRow}>
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder="Новый тег..."
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={handleCreateTag}
        />
        <Pressable
          onPress={handleCreateTag}
          style={[styles.smallBtn, { backgroundColor: colors.tint }]}
        >
          <FontAwesome name="plus" size={14} color="#fff" />
        </Pressable>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>
        Время выполнения
      </Text>
      <TimePickerField
        value={scheduledTime}
        onChange={setScheduledTime}
        placeholder="Выбрать время"
      />

      <Text style={[styles.label, { color: colors.text }]}>Расписание</Text>
      <View style={styles.scheduleOptions}>
        {SCHEDULE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setScheduleType(opt.key)}
            style={[
              styles.scheduleChip,
              {
                backgroundColor:
                  scheduleType === opt.key
                    ? colors.tint + "20"
                    : colors.surfaceSecondary,
                borderColor:
                  scheduleType === opt.key ? colors.tint : "transparent",
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={{
                color:
                  scheduleType === opt.key ? colors.tint : colors.textSecondary,
                fontSize: FontSize.sm,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {scheduleType === "weekdays" && (
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label, index) => {
            const jsDay = WEEKDAY_JS[index];
            const active = selectedWeekdays.includes(jsDay);
            return (
              <Pressable
                key={label}
                onPress={() => toggleWeekday(jsDay)}
                style={[
                  styles.weekdayBtn,
                  {
                    backgroundColor: active
                      ? colors.tint
                      : colors.surfaceSecondary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : colors.textSecondary,
                    fontSize: FontSize.xs,
                    fontWeight: "600",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {scheduleType === "interval" && (
        <View style={styles.inlineRow}>
          <Text style={{ color: colors.text, fontSize: FontSize.md }}>
            Каждые
          </Text>
          <TextInput
            style={[
              styles.smallInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={intervalDays}
            onChangeText={setIntervalDays}
            keyboardType="number-pad"
          />
          <Text style={{ color: colors.text, fontSize: FontSize.md }}>
            дней
          </Text>
        </View>
      )}

      {scheduleType === "times_per_day" && (
        <View style={styles.inlineRow}>
          <Text style={{ color: colors.text, fontSize: FontSize.md }}>
            Раз в день:
          </Text>
          <TextInput
            style={[
              styles.smallInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={timesPerDay}
            onChangeText={setTimesPerDay}
            keyboardType="number-pad"
          />
        </View>
      )}

      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
          Подпункты
        </Text>
        <Switch value={hasChecklist} onValueChange={setHasChecklist} />
      </View>

      {hasChecklist && (
        <View style={styles.checklistEditor}>
          {checklistItems.map((item, index) => (
            <View key={item.id ?? `new-${index}`} style={styles.checklistRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={item.label}
                onChangeText={(text) => {
                  const updated = [...checklistItems];
                  updated[index] = { ...updated[index], label: text };
                  setChecklistItems(updated);
                }}
                placeholder={`Пункт ${index + 1}`}
                placeholderTextColor={colors.textSecondary}
              />
              <TimePickerField
                compact
                value={item.scheduledTime}
                onChange={(text) => {
                  const updated = [...checklistItems];
                  updated[index] = { ...updated[index], scheduledTime: text };
                  setChecklistItems(updated);
                }}
                placeholder="ЧЧ:ММ"
              />
              <Pressable
                onPress={() =>
                  setChecklistItems(checklistItems.filter((_, i) => i !== index))
                }
                hitSlop={8}
              >
                <FontAwesome name="trash-o" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() =>
              setChecklistItems([
                ...checklistItems,
                { label: "", scheduledTime: "", isRequired: true },
              ])
            }
            style={styles.addItemBtn}
          >
            <FontAwesome name="plus" size={14} color={colors.tint} />
            <Text style={{ color: colors.tint, fontSize: FontSize.sm }}>
              Добавить пункт
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={handleSave}
        disabled={saving || !title.trim()}
        style={[
          styles.saveButton,
          {
            backgroundColor: title.trim()
              ? colors.tint
              : colors.surfaceSecondary,
            opacity: saving ? 0.6 : 1,
          },
        ]}
      >
        <Text style={styles.saveButtonText}>
          {saving ? "Сохранение..." : "Сохранить изменения"}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleArchive}
        style={[styles.archiveButton, { borderColor: colors.border }]}
      >
        <Text style={[styles.archiveText, { color: colors.textSecondary }]}>
          Архивировать привычку
        </Text>
      </Pressable>

      <Pressable
        onPress={handleDelete}
        style={[styles.deleteButton, { backgroundColor: colors.error + "15" }]}
      >
        <Text style={[styles.deleteText, { color: colors.error }]}>
          Удалить навсегда
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: Spacing.md, paddingBottom: 48, gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
  },
  multiline: { minHeight: 64, textAlignVertical: "top" },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  tagChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  newTagRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  smallBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  scheduleOptions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  scheduleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  weekdayBtn: {
    width: 40,
    height: 36,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    width: 60,
    textAlign: "center",
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    width: 104,
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  checklistEditor: { gap: Spacing.xs, marginTop: Spacing.sm },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  saveButtonText: { color: "#fff", fontSize: FontSize.md, fontWeight: "700" },
  archiveButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    borderWidth: 1,
  },
  archiveText: { fontSize: FontSize.md, fontWeight: "600" },
  deleteButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  deleteText: { fontSize: FontSize.md, fontWeight: "700" },
});
