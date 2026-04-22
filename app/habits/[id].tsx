import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import {
    getDayOfWeek,
    getLocalToday,
    getMonthDates,
} from "@/src/lib/date/localDay";
import {
    fetchHabitCompletions,
    fetchSubStatuses,
} from "@/src/lib/supabase/queries";
import { useHabitsStore } from "@/src/store/habitsStore";

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { habits, loadAll, toggleSimpleCompletion, toggleSubItem } =
    useHabitsStore();

  const habit = habits.find((h) => h.id === id);
  const today = getLocalToday();

  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [completionDates, setCompletionDates] = useState<
    Record<string, string>
  >({});
  const [subStatuses, setSubStatuses] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<string>(today);

  useEffect(() => {
    loadAll();
  }, []);

  // Load completion records for this habit in the current month
  useEffect(() => {
    if (!id) return;
    (async () => {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
      const map = await fetchHabitCompletions(id, startDate, endDate);
      setCompletionDates(map);
    })();
  }, [id, year, month, habits]);

  // Load sub-item statuses for selected date
  useEffect(() => {
    if (!id) return;
    (async () => {
      const subMap = await fetchSubStatuses(id, selectedDate);
      setSubStatuses(subMap);
    })();
  }, [id, selectedDate, habits]);

  const dates = useMemo(() => getMonthDates(year, month), [year, month]);
  const firstDayOffset = (() => {
    const d = getDayOfWeek(dates[0]);
    return d === 0 ? 6 : d - 1;
  })();

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const monthName = new Date(year, month - 1).toLocaleString("ru", {
    month: "long",
  });

  if (!habit) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Привычка не найдена</Text>
      </View>
    );
  }

  const isCompound = habit.checklistItems.length > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: habit.color + "15" }]}>
        <View style={[styles.colorBar, { backgroundColor: habit.color }]} />
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              {habit.title}
            </Text>
            <Pressable
              onPress={() => router.push(`/habits/edit?id=${habit.id}`)}
              style={[
                styles.editButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <FontAwesome name="pencil" size={14} color={habit.color} />
              <Text style={[styles.editButtonText, { color: habit.color }]}>
                Изменить
              </Text>
            </Pressable>
          </View>
          {habit.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {habit.description}
            </Text>
          )}
          <View style={styles.tagRow}>
            {habit.tags.map((tag) => (
              <View
                key={tag.id}
                style={[
                  styles.tagChip,
                  { backgroundColor: (tag.color ?? colors.tint) + "20" },
                ]}
              >
                <Text
                  style={{
                    color: tag.color ?? colors.tint,
                    fontSize: FontSize.xs,
                  }}
                >
                  {tag.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Selected date checklist or quick toggle */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {selectedDate === today
            ? "Сегодня"
            : selectedDate.split("-").reverse().join(".")}
        </Text>
        {isCompound ? (
          <View style={styles.checklist}>
            {habit.checklistItems.map((item) => {
              const done = subStatuses[item.id] ?? false;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    toggleSubItem(habit.id, item.id, selectedDate);
                  }}
                  style={[
                    styles.checklistRow,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <FontAwesome
                    name={done ? "check-square" : "square-o"}
                    size={22}
                    color={done ? habit.color : colors.tabIconDefault}
                  />
                  <Text
                    style={[
                      styles.checklistLabel,
                      { color: done ? colors.textSecondary : colors.text },
                      done && styles.strikethrough,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.scheduledTime ? (
                    <View
                      style={[
                        styles.subTimeBadge,
                        { backgroundColor: habit.color + "15" },
                      ]}
                    >
                      <FontAwesome name="clock-o" size={11} color={habit.color} />
                      <Text style={[styles.subTimeText, { color: habit.color }]}>
                        {item.scheduledTime}
                      </Text>
                    </View>
                  ) : null}
                  {item.isRequired && (
                    <Text
                      style={[styles.requiredBadge, { color: colors.error }]}
                    >
                      *
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Pressable
            onPress={() => toggleSimpleCompletion(habit.id, selectedDate)}
            style={[styles.simpleToggle, { backgroundColor: colors.surface }]}
          >
            <FontAwesome
              name={
                completionDates[selectedDate] === "done"
                  ? "check-circle"
                  : "circle-o"
              }
              size={32}
              color={
                completionDates[selectedDate] === "done"
                  ? habit.color
                  : colors.tabIconDefault
              }
            />
            <Text style={[styles.toggleText, { color: colors.text }]}>
              {completionDates[selectedDate] === "done"
                ? "Выполнено"
                : "Отметить выполнение"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Calendar */}
      <View style={styles.section}>
        <View style={styles.monthNav}>
          <Pressable onPress={prevMonth} hitSlop={12}>
            <FontAwesome name="chevron-left" size={16} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {monthName} {year}
          </Text>
          <Pressable onPress={nextMonth} hitSlop={12}>
            <FontAwesome name="chevron-right" size={16} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS_SHORT.map((d) => (
            <Text
              key={d}
              style={[styles.weekDay, { color: colors.textSecondary }]}
            >
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <View key={`pad-${i}`} style={styles.dayCell} />
          ))}
          {dates.map((date) => {
            const status = completionDates[date];
            const isDone = status === "done";
            const isPartial = status === "partial";
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const isFuture = date > today;
            return (
              <Pressable
                key={date}
                disabled={isFuture}
                onPress={() => !isFuture && setSelectedDate(date)}
                style={[
                  styles.dayCell,
                  isDone && {
                    backgroundColor: habit.color + "30",
                    borderRadius: CELL_SIZE / 2,
                  },
                  isPartial && {
                    backgroundColor: habit.color + "25",
                    borderRadius: CELL_SIZE / 2,
                  },
                  isSelected && {
                    borderColor: habit.color,
                    borderWidth: 2,
                    borderRadius: CELL_SIZE / 2,
                  },
                  isToday &&
                    !isSelected && {
                      borderColor: colors.tint,
                      borderWidth: 1.5,
                      borderRadius: CELL_SIZE / 2,
                    },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: isDone
                        ? habit.color
                        : isFuture
                          ? colors.tabIconDefault
                          : colors.text,
                    },
                    isDone && { fontWeight: "700" },
                  ]}
                >
                  {Number(date.slice(8))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: Spacing.md, flexDirection: "row", gap: Spacing.md },
  colorBar: { width: 4, borderRadius: 2 },
  headerContent: { flex: 1, gap: Spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  title: { fontSize: FontSize.xl, fontWeight: "700" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  editButtonText: { fontSize: FontSize.xs, fontWeight: "700" },
  description: { fontSize: FontSize.sm },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  section: { padding: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  checklist: { gap: Spacing.xs },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  checklistLabel: { flex: 1, fontSize: FontSize.md },
  subTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  subTimeText: { fontSize: FontSize.xs, fontWeight: "700" },
  strikethrough: { textDecorationLine: "line-through" },
  requiredBadge: { fontSize: FontSize.lg, fontWeight: "700" },
  simpleToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  toggleText: { fontSize: FontSize.md, fontWeight: "500" },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  monthTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  weekRow: { flexDirection: "row", justifyContent: "space-around" },
  weekDay: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: FontSize.xs,
    fontWeight: "500",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE + 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: FontSize.sm },
});
