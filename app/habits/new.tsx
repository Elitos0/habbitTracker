import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import {
    Colors,
    DEFAULT_TAGS,
    FontSize,
    HABIT_COLORS,
    Radius,
    Spacing,
} from "@/constants/theme";
import { useHabitsStore } from "@/src/store/habitsStore";

const SCHEDULE_OPTIONS = [
  { key: "daily", label: "Каждый день" },
  { key: "weekdays", label: "По дням недели" },
  { key: "interval", label: "Каждые N дней" },
  { key: "times_per_day", label: "Несколько раз в день" },
] as const;

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
// Map display index (0=Mon) to JS day (1=Mon, 0=Sun)
const WEEKDAY_JS = [1, 2, 3, 4, 5, 6, 0];

export default function NewHabitScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { tags, addHabit, addTag, loadAll } = useHabitsStore();

  useEffect(() => {
    loadAll();
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(HABIT_COLORS[4]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<string>("daily");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [intervalDays, setIntervalDays] = useState("2");
  const [timesPerDay, setTimesPerDay] = useState("3");
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistLabels, setChecklistLabels] = useState<string[]>([
    "Утро",
    "День",
    "Вечер",
  ]);
  const [newTagName, setNewTagName] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed default tags on first render if none exist
  useEffect(() => {
    if (tags.length === 0) {
      (async () => {
        for (const dt of DEFAULT_TAGS) {
          await addTag(dt.name, dt.color);
        }
      })();
    }
  }, [tags.length]);

  const toggleWeekday = (jsDay: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(jsDay) ? prev.filter((d) => d !== jsDay) : [...prev, jsDay],
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const schedule: any = { scheduleType };
    if (scheduleType === "weekdays") schedule.weekdays = selectedWeekdays;
    if (scheduleType === "interval")
      schedule.intervalDays = Number(intervalDays) || 2;
    if (scheduleType === "times_per_day")
      schedule.timesPerDay = Number(timesPerDay) || 1;

    const checklistItems = hasChecklist
      ? checklistLabels
          .filter((l) => l.trim())
          .map((label) => ({ label, isRequired: true }))
      : undefined;

    await addHabit({
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      tagIds: selectedTagIds,
      scheduledTime: scheduledTime.match(/^\d{2}:\d{2}$/)
        ? scheduledTime
        : undefined,
      schedule,
      checklistItems,
    });

    setSaving(false);
    router.back();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const id = await addTag(newTagName.trim());
    setSelectedTagIds((prev) => [...prev, id]);
    setNewTagName("");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Title */}
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
        autoFocus
      />

      {/* Description */}
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

      {/* Color picker */}
      <Text style={[styles.label, { color: colors.text }]}>Цвет</Text>
      <View style={styles.colorRow}>
        {HABIT_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.colorCircle,
              { backgroundColor: c },
              c === color && styles.colorSelected,
            ]}
          >
            {c === color && <FontAwesome name="check" size={14} color="#fff" />}
          </Pressable>
        ))}
      </View>

      {/* Tags */}
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
                    ? prev.filter((id) => id !== tag.id)
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

      {/* Time */}
      <Text style={[styles.label, { color: colors.text }]}>
        Время выполнения
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border,
            width: 120,
          },
        ]}
        value={scheduledTime}
        onChangeText={(text) => {
          // Auto-format: add colon after 2 digits
          const digits = text.replace(/[^\d]/g, "").slice(0, 4);
          if (digits.length > 2) {
            setScheduledTime(`${digits.slice(0, 2)}:${digits.slice(2)}`);
          } else {
            setScheduledTime(digits);
          }
        }}
        placeholder="ЧЧ:ММ"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        maxLength={5}
      />

      {/* Schedule */}
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
          {WEEKDAY_LABELS.map((label, i) => {
            const jsDay = WEEKDAY_JS[i];
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

      {/* Checklist */}
      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
          Подпункты
        </Text>
        <Switch value={hasChecklist} onValueChange={setHasChecklist} />
      </View>

      {hasChecklist && (
        <View style={styles.checklistEditor}>
          {checklistLabels.map((label, i) => (
            <View key={i} style={styles.checklistRow}>
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
                value={label}
                onChangeText={(text) => {
                  const updated = [...checklistLabels];
                  updated[i] = text;
                  setChecklistLabels(updated);
                }}
                placeholder={`Пункт ${i + 1}`}
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable
                onPress={() =>
                  setChecklistLabels(checklistLabels.filter((_, j) => j !== i))
                }
                hitSlop={8}
              >
                <FontAwesome name="trash-o" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => setChecklistLabels([...checklistLabels, ""])}
            style={styles.addItemBtn}
          >
            <FontAwesome name="plus" size={14} color={colors.tint} />
            <Text style={{ color: colors.tint, fontSize: FontSize.sm }}>
              Добавить пункт
            </Text>
          </Pressable>
        </View>
      )}

      {/* Save button */}
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
          {saving ? "Сохранение..." : "Сохранить привычку"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
});
