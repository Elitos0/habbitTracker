import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import ConfirmDialog from "@/components/ConfirmDialog";
import DatePickerModal from "@/components/DatePickerModal";
import HabitActionSheet from "@/components/HabitActionSheet";
import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import type { HabitWithDetails } from "@/src/domain/habits";
import { isHabitExpectedOnDate } from "@/src/domain/schedule";
import {
    addDays,
    getLocalToday,
    parseLocalDate,
} from "@/src/lib/date/localDay";
import { useHabitsStore } from "@/src/store/habitsStore";

function fmtDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

type FilterMode = "all" | "today" | "week" | "custom";

const FILTER_OPTIONS: { key: FilterMode; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "today", label: "Сегодня" },
  { key: "week", label: "Неделя" },
  { key: "custom", label: "Дата" },
];

export default function HabitsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const {
    habits,
    isLoading,
    loadAll,
    toggleSimpleCompletion,
    toggleSubItem,
    archiveHabit,
    deleteHabit,
  } = useHabitsStore();

  const [filterMode, setFilterMode] = useState<FilterMode>("today");
  const [customDate, setCustomDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [menuHabit, setMenuHabit] = useState<HabitWithDetails | null>(null);
  const [confirmDeleteHabit, setConfirmDeleteHabit] =
    useState<HabitWithDetails | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const today = getLocalToday();

  // Compute the current week's date range (Mon–Sun)
  const weekDates = useMemo(() => {
    const d = parseLocalDate(today);
    const jsDay = d.getDay(); // 0=Sun
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = addDays(today, mondayOffset);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) dates.push(addDays(monday, i));
    return dates;
  }, [today]);

  const filteredHabits = useMemo(() => {
    if (filterMode === "all") return habits;
    if (filterMode === "today") {
      return habits.filter((h) => isHabitExpectedOnDate(h.schedule, today));
    }
    if (filterMode === "week") {
      return habits.filter((h) =>
        weekDates.some((d) => isHabitExpectedOnDate(h.schedule, d)),
      );
    }
    if (filterMode === "custom" && customDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      if (rangeStart && rangeEnd) {
        // Range mode: show habits expected on ANY day in the range
        return habits.filter((h) => {
          let d = rangeStart;
          while (d <= rangeEnd) {
            if (isHabitExpectedOnDate(h.schedule, d)) return true;
            d = addDays(d, 1);
          }
          return false;
        });
      }
      return habits.filter((h) =>
        isHabitExpectedOnDate(h.schedule, customDate),
      );
    }
    return habits;
  }, [habits, filterMode, today, weekDates, customDate]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const renderHabit = ({ item }: { item: HabitWithDetails }) => {
    const isDone = item.todayStatus === "done";
    const isPartial = item.todayStatus === "partial";
    const isCompound = item.checklistItems.length > 0;
    const isExpanded = expandedIds.has(item.id);

    return (
      <View>
        <Pressable
          onPress={() => router.push(`/habits/${item.id}`)}
          onLongPress={() => setMenuHabit(item)}
          delayLongPress={350}
          style={[
            styles.habitCard,
            {
              backgroundColor: colors.surface,
              borderLeftColor: item.color,
              borderLeftWidth: 4,
            },
          ]}
        >
          <View style={styles.habitContent}>
            <View style={styles.habitTitleRow}>
              <Text style={[styles.habitTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              {item.scheduledTime ? (
                <View
                  style={[
                    styles.timeBadge,
                    { backgroundColor: item.color + "15" },
                  ]}
                >
                  <FontAwesome name="clock-o" size={11} color={item.color} />
                  <Text style={[styles.timeText, { color: item.color }]}>
                    {item.scheduledTime}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: tag.color
                        ? tag.color + "20"
                        : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: tag.color ?? colors.textSecondary },
                    ]}
                  >
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.rightActions}>
            {isCompound && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  toggleExpand(item.id);
                }}
                hitSlop={8}
                style={styles.expandBtn}
              >
                <FontAwesome
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.tabIconDefault}
                />
              </Pressable>
            )}
            {!isCompound ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  toggleSimpleCompletion(item.id, today);
                }}
                hitSlop={12}
                style={styles.checkButton}
              >
                <FontAwesome
                  name={isDone ? "check-circle" : "circle-o"}
                  size={28}
                  color={isDone ? item.color : colors.tabIconDefault}
                />
              </Pressable>
            ) : (
              <View style={styles.statusBadge}>
                <FontAwesome
                  name={
                    isDone ? "check-circle" : isPartial ? "adjust" : "circle-o"
                  }
                  size={28}
                  color={
                    isDone
                      ? item.color
                      : isPartial
                        ? item.color
                        : colors.tabIconDefault
                  }
                />
              </View>
            )}
          </View>
        </Pressable>

        {/* Expandable sub-items */}
        {isCompound && isExpanded && (
          <View style={styles.subItemsContainer}>
            {item.checklistItems.map((ci) => {
              const subDone = item.todaySubStatuses?.[ci.id] ?? false;
              return (
                <Pressable
                  key={ci.id}
                  onPress={() => toggleSubItem(item.id, ci.id, today)}
                  style={[
                    styles.subChip,
                    {
                      backgroundColor: subDone
                        ? item.color + "18"
                        : colors.surfaceSecondary,
                      borderColor: subDone ? item.color + "40" : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.subChipDot,
                      {
                        backgroundColor: subDone ? item.color : "transparent",
                        borderColor: subDone
                          ? item.color
                          : colors.tabIconDefault,
                      },
                    ]}
                  >
                    {subDone && (
                      <FontAwesome name="check" size={8} color="#fff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.subChipLabel,
                      {
                        color: subDone ? item.color : colors.text,
                      },
                    ]}
                  >
                    {ci.label}
                  </Text>
                  {ci.scheduledTime ? (
                    <View
                      style={[
                        styles.subTimeBadge,
                        { backgroundColor: subDone ? "#fff8" : item.color + "15" },
                      ]}
                    >
                      <FontAwesome name="clock-o" size={10} color={item.color} />
                      <Text style={[styles.subTimeText, { color: item.color }]}>
                        {ci.scheduledTime}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setFilterMode(opt.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filterMode === opt.key
                      ? colors.tint + "20"
                      : colors.surfaceSecondary,
                  borderColor:
                    filterMode === opt.key ? colors.tint : "transparent",
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    filterMode === opt.key ? colors.tint : colors.textSecondary,
                  fontSize: FontSize.sm,
                  fontWeight: filterMode === opt.key ? "600" : "400",
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {filterMode === "custom" && (
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.dateButton,
              {
                backgroundColor: colors.surface,
                borderColor: customDate ? colors.tint : colors.border,
              },
            ]}
          >
            <FontAwesome
              name="calendar"
              size={14}
              color={customDate ? colors.tint : colors.textSecondary}
            />
            <Text
              style={[
                styles.dateButtonText,
                {
                  color: customDate ? colors.text : colors.textSecondary,
                },
              ]}
            >
              {rangeStart && rangeEnd
                ? `${fmtDisplayDate(rangeStart)} — ${fmtDisplayDate(rangeEnd)}`
                : customDate
                  ? fmtDisplayDate(customDate)
                  : "Выбрать дату"}
            </Text>
            <FontAwesome
              name="chevron-down"
              size={10}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filteredHabits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FontAwesome name="leaf" size={48} color={colors.tabIconDefault} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterMode === "all"
                ? "Пока нет привычек"
                : "Нет привычек на выбранный период"}
            </Text>
            {filterMode === "all" && (
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Нажмите + чтобы создать первую
              </Text>
            )}
          </View>
        }
      />

      <Pressable
        onPress={() => router.push("/habits/new")}
        style={[styles.fab, { backgroundColor: colors.tint }]}
      >
        <FontAwesome name="plus" size={24} color="#fff" />
      </Pressable>

      <HabitActionSheet
        visible={menuHabit !== null}
        habitTitle={menuHabit?.title ?? ""}
        onArchive={() => {
          if (menuHabit) archiveHabit(menuHabit.id);
        }}
        onDelete={() => {
          if (menuHabit) setConfirmDeleteHabit(menuHabit);
        }}
        onClose={() => setMenuHabit(null)}
      />

      <ConfirmDialog
        visible={confirmDeleteHabit !== null}
        title="Удалить привычку?"
        message={
          confirmDeleteHabit
            ? `«${confirmDeleteHabit.title}» и вся её история будут удалены без возможности восстановления.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        onConfirm={() => {
          if (confirmDeleteHabit) deleteHabit(confirmDeleteHabit.id);
          setConfirmDeleteHabit(null);
        }}
        onCancel={() => setConfirmDeleteHabit(null)}
      />

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={customDate || undefined}
        rangeStart={rangeStart || undefined}
        rangeEnd={rangeEnd || undefined}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => {
          setCustomDate(date);
          setRangeStart("");
          setRangeEnd("");
        }}
        onSelectRange={(start, end) => {
          setCustomDate(start);
          setRangeStart(start);
          setRangeEnd(end);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterBar: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  dateButtonText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  list: { padding: Spacing.md },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  habitContent: { flex: 1, marginRight: Spacing.md },
  habitTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  habitTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  timeText: {
    fontSize: FontSize.xs,
    fontWeight: "500",
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tagText: { fontSize: FontSize.xs },
  rightActions: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  expandBtn: {
    padding: Spacing.xs,
  },
  checkButton: { padding: Spacing.xs },
  statusBadge: { padding: Spacing.xs },
  subItemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    marginTop: -Spacing.sm,
    gap: Spacing.xs,
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  subChipDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  subChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  subTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  subTimeText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  emptyHint: { fontSize: FontSize.sm, marginTop: Spacing.xs },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
