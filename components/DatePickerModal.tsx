import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL = Math.floor((Math.min(SCREEN_WIDTH, 420) - Spacing.lg * 2) / 7);

type PickerMode = "single" | "range";

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  onSelectRange?: (start: string, end: string) => void;
  selectedDate?: string;
  rangeStart?: string;
  rangeEnd?: string;
  initialMode?: PickerMode;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmtDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  onSelectRange,
  selectedDate,
  rangeStart,
  rangeEnd,
  initialMode = "single",
}: DatePickerModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [mode, setMode] = useState<PickerMode>(initialMode);

  // Range selection state (internal)
  const [localStart, setLocalStart] = useState<string | undefined>(rangeStart);
  const [localEnd, setLocalEnd] = useState<string | undefined>(rangeEnd);
  const [localSingle, setLocalSingle] = useState<string | undefined>(
    selectedDate,
  );

  const todayStr = fmt(now.getFullYear(), now.getMonth(), now.getDate());

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const jsDay = first.getDay();
    const startOffset = jsDay === 0 ? 6 : jsDay - 1; // Mon-based
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { day: number; dateStr: string; inMonth: boolean }[] = [];

    // Previous month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const pm = viewMonth === 0 ? 11 : viewMonth - 1;
      const py = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day: d, dateStr: fmt(py, pm, d), inMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateStr: fmt(viewYear, viewMonth, d),
        inMonth: true,
      });
    }

    // Fill to 42 (6 rows)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = viewMonth === 11 ? 0 : viewMonth + 1;
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: d, dateStr: fmt(ny, nm, d), inMonth: false });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handleDayPress = (dateStr: string) => {
    if (mode === "single") {
      setLocalSingle(dateStr);
    } else {
      // Range mode
      if (!localStart || (localStart && localEnd)) {
        // Start new range
        setLocalStart(dateStr);
        setLocalEnd(undefined);
      } else {
        // Set end
        if (dateStr < localStart) {
          setLocalEnd(localStart);
          setLocalStart(dateStr);
        } else {
          setLocalEnd(dateStr);
        }
      }
    }
  };

  const handleApply = () => {
    if (mode === "single" && localSingle) {
      onSelectDate(localSingle);
    } else if (mode === "range" && localStart) {
      if (onSelectRange && localEnd) {
        onSelectRange(localStart, localEnd);
      } else if (localStart) {
        onSelectDate(localStart);
      }
    }
    onClose();
  };

  const isInRange = (dateStr: string) => {
    if (mode !== "range" || !localStart || !localEnd) return false;
    return dateStr > localStart && dateStr < localEnd;
  };

  const isRangeStart = (dateStr: string) =>
    mode === "range" && localStart === dateStr;
  const isRangeEnd = (dateStr: string) =>
    mode === "range" && localEnd === dateStr;
  const isSelected = (dateStr: string) =>
    mode === "single" && localSingle === dateStr;

  const displaySelection = () => {
    if (mode === "single" && localSingle) return fmtDisplay(localSingle);
    if (mode === "range") {
      if (localStart && localEnd)
        return `${fmtDisplay(localStart)} — ${fmtDisplay(localEnd)}`;
      if (localStart) return `${fmtDisplay(localStart)} — ...`;
    }
    return "Не выбрано";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode("single")}
              style={[
                styles.modeBtn,
                {
                  backgroundColor:
                    mode === "single" ? colors.tint : colors.surfaceSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  { color: mode === "single" ? "#fff" : colors.textSecondary },
                ]}
              >
                Дата
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode("range");
                setLocalStart(undefined);
                setLocalEnd(undefined);
              }}
              style={[
                styles.modeBtn,
                {
                  backgroundColor:
                    mode === "range" ? colors.tint : colors.surfaceSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  { color: mode === "range" ? "#fff" : colors.textSecondary },
                ]}
              >
                Период
              </Text>
            </Pressable>
          </View>

          {/* Month nav */}
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
              <FontAwesome name="chevron-left" size={16} color={colors.tint} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
              <FontAwesome name="chevron-right" size={16} color={colors.tint} />
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((wd) => (
              <View key={wd} style={styles.weekCell}>
                <Text
                  style={[styles.weekDayText, { color: colors.textSecondary }]}
                >
                  {wd}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {days.map((cell, idx) => {
              const sel = isSelected(cell.dateStr);
              const rStart = isRangeStart(cell.dateStr);
              const rEnd = isRangeEnd(cell.dateStr);
              const inRange = isInRange(cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const highlighted = sel || rStart || rEnd;

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleDayPress(cell.dateStr)}
                  style={[styles.dayOuter]}
                >
                  {/* Range background bar */}
                  {(inRange || rStart || rEnd) && (
                    <View
                      style={[
                        styles.rangeBg,
                        { backgroundColor: colors.tint + "18" },
                        rStart && { left: "50%", right: 0 },
                        rEnd && { left: 0, right: "50%" },
                      ]}
                    />
                  )}
                  <View
                    style={[
                      styles.dayCircle,
                      highlighted && { backgroundColor: colors.tint },
                      isToday &&
                        !highlighted && {
                          borderWidth: 2,
                          borderColor: colors.tint,
                        },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: !cell.inMonth
                            ? colors.textSecondary + "50"
                            : highlighted
                              ? "#fff"
                              : isToday
                                ? colors.tint
                                : colors.text,
                        },
                        highlighted && { fontWeight: "700" },
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Selection display */}
          <View
            style={[
              styles.selectionBar,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <FontAwesome name="calendar-o" size={14} color={colors.tint} />
            <Text style={[styles.selectionText, { color: colors.text }]}>
              {displaySelection()}
            </Text>
          </View>

          {/* Bottom buttons */}
          <View style={styles.bottomRow}>
            <Pressable
              onPress={onClose}
              style={[
                styles.bottomBtn,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text
                style={[styles.bottomBtnText, { color: colors.textSecondary }]}
              >
                Отмена
              </Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              style={[styles.bottomBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.bottomBtnText, { color: "#fff" }]}>
                Готово
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: Math.min(SCREEN_WIDTH - 32, 400),
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modeRow: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: Radius.full,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  modeBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  modeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  navBtn: { padding: Spacing.sm },
  monthLabel: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  weekDayText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayOuter: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  rangeBg: {
    position: "absolute",
    top: "20%",
    bottom: "20%",
    left: 0,
    right: 0,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: FontSize.sm,
    textAlign: "center",
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectionText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    alignItems: "center",
  },
  bottomBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
