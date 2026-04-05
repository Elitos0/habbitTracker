import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { isHabitExpectedOnDate } from "@/src/domain/schedule";
import {
    addDays,
    getDayOfWeek,
    getLocalToday,
    getMonthDates,
} from "@/src/lib/date/localDay";
import {
    fetchAllCompletions,
    fetchHabitCompletions,
} from "@/src/lib/supabase/queries";
import { useHabitsStore } from "@/src/store/habitsStore";

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { habits, loadAll } = useHabitsStore();

  const today = getLocalToday();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const selectedHabit = selectedHabitId
    ? (habits.find((h) => h.id === selectedHabitId) ?? null)
    : null;

  const dates = useMemo(() => getMonthDates(year, month), [year, month]);

  // Build dateMap: when filtered — single habit status; when "all" — array of dots
  const [dateMapAll, setDateMapAll] = useState<
    Record<string, { color: string; status: string }[]>
  >({});
  const [dateMapSingle, setDateMapSingle] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    (async () => {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

      if (selectedHabitId) {
        const map = await fetchHabitCompletions(
          selectedHabitId,
          startDate,
          endDate,
        );
        setDateMapSingle(map);
        setDateMapAll({});
      } else {
        const map = await fetchAllCompletions(startDate, endDate);
        setDateMapAll(map);
        setDateMapSingle({});
      }
    })();
  }, [year, month, habits, selectedHabitId]);

  // Build a Set of "done" dates for streak bar computation (single-habit only)
  const doneSet = useMemo(() => {
    if (!selectedHabitId) return new Set<string>();
    const s = new Set<string>();
    for (const [date, status] of Object.entries(dateMapSingle)) {
      if (status === "done") s.add(date);
    }
    return s;
  }, [dateMapSingle, selectedHabitId]);

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

  // Determine the weekday column index (0=Mon, 6=Sun) for a date string
  const getColIndex = (date: string) => {
    const d = getDayOfWeek(date);
    return d === 0 ? 6 : d - 1;
  };

  const habitColor = selectedHabit?.color ?? colors.tint;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Habit filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          onPress={() => setSelectedHabitId(null)}
          style={[
            styles.filterPill,
            {
              backgroundColor: !selectedHabitId
                ? colors.tint + "20"
                : colors.surfaceSecondary,
              borderColor: !selectedHabitId ? colors.tint : "transparent",
              borderWidth: 1,
            },
          ]}
        >
          <Text
            style={{
              color: !selectedHabitId ? colors.tint : colors.textSecondary,
              fontSize: FontSize.sm,
              fontWeight: "600",
            }}
          >
            Все
          </Text>
        </Pressable>
        {habits.map((h) => (
          <Pressable
            key={h.id}
            onPress={() =>
              setSelectedHabitId(selectedHabitId === h.id ? null : h.id)
            }
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  selectedHabitId === h.id
                    ? h.color + "20"
                    : colors.surfaceSecondary,
                borderColor: selectedHabitId === h.id ? h.color : "transparent",
                borderWidth: 1,
              },
            ]}
          >
            <View style={[styles.filterDot, { backgroundColor: h.color }]} />
            <Text
              style={{
                color:
                  selectedHabitId === h.id ? h.color : colors.textSecondary,
                fontSize: FontSize.sm,
              }}
            >
              {h.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <Pressable onPress={prevMonth} hitSlop={12}>
          <FontAwesome name="chevron-left" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {monthName} {year}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={12}>
          <FontAwesome name="chevron-right" size={18} color={colors.text} />
        </Pressable>
      </View>

      {/* Weekday headers */}
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

      {/* Calendar grid */}
      <View style={styles.grid}>
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <View key={`pad-${i}`} style={styles.dayCell} />
        ))}
        {dates.map((date) => {
          const isToday = date === today;
          const isFuture = date > today;

          if (selectedHabitId && selectedHabit) {
            // ── Single-habit mode: circles with streak bars ──
            const status = dateMapSingle[date]; // "done" | "partial" | undefined
            const isDone = status === "done";
            const isPartial = status === "partial";
            const expected = isHabitExpectedOnDate(
              selectedHabit.schedule,
              date,
            );

            // Streak bar: connect consecutive done days
            const prevDate = addDays(date, -1);
            const nextDate = addDays(date, 1);
            const prevDone = doneSet.has(prevDate);
            const nextDone = doneSet.has(nextDate);
            // Don't connect across row boundaries
            const col = getColIndex(date);
            const connectLeft = isDone && prevDone && col > 0;
            const connectRight = isDone && nextDone && col < 6;

            // Determine circle style
            let circleBg = "transparent";
            let textColor = colors.text;
            if (isDone) {
              circleBg = habitColor;
              textColor = "#fff";
            } else if (isPartial) {
              circleBg = habitColor + "40";
              textColor = habitColor;
            } else if (!isFuture && expected) {
              // Missed — expected but not done
              circleBg = colors.error + "18";
              textColor = colors.error;
            } else if (!isFuture && !expected) {
              // Not expected — light gray
              circleBg = colors.tabIconDefault + "20";
              textColor = colors.tabIconDefault;
            }

            return (
              <View key={date} style={styles.dayCell}>
                {/* Streak connection bars */}
                {connectLeft && (
                  <View
                    style={[
                      styles.streakBar,
                      styles.streakLeft,
                      { backgroundColor: habitColor + "30" },
                    ]}
                  />
                )}
                {connectRight && (
                  <View
                    style={[
                      styles.streakBar,
                      styles.streakRight,
                      { backgroundColor: habitColor + "30" },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.circle,
                    { backgroundColor: circleBg },
                    isToday && {
                      borderColor: colors.tint,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: textColor },
                      isDone && { fontWeight: "700" },
                    ]}
                  >
                    {Number(date.slice(8))}
                  </Text>
                </View>
              </View>
            );
          }

          // ── All-habits mode: dots below date ──
          const entries = dateMapAll[date];
          return (
            <View key={date} style={[styles.dayCell]}>
              <View
                style={[
                  styles.circle,
                  isToday && {
                    borderColor: colors.tint,
                    borderWidth: 2,
                  },
                ]}
              >
                <Text style={[styles.dayText, { color: colors.text }]}>
                  {Number(date.slice(8))}
                </Text>
              </View>
              {entries && (
                <View style={styles.dotRow}>
                  {entries.slice(0, 4).map((e, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: e.color,
                          opacity: e.status === "partial" ? 0.5 : 1,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  monthTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  weekDay: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: FontSize.xs,
    fontWeight: "500",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.sm,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE + 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  circle: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: FontSize.sm },
  dotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 1,
    position: "absolute",
    bottom: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  streakBar: {
    position: "absolute",
    top: "50%",
    marginTop: -(CELL_SIZE / 2),
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
  },
  streakLeft: {
    left: 0,
    width: "50%",
  },
  streakRight: {
    right: 0,
    width: "50%",
  },
});
