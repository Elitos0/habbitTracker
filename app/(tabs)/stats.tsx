import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { getLocalToday } from "@/src/lib/date/localDay";
import { fetchHabitStats } from "@/src/lib/supabase/queries";
import { useHabitsStore } from "@/src/store/habitsStore";

interface HabitStats {
  habitId: string;
  streak: number;
  completionRate: number;
}

export default function StatsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { habits, loadAll } = useHabitsStore();
  const [habitStats, setHabitStats] = useState<Record<string, HabitStats>>({});

  useEffect(() => {
    loadAll();
  }, []);

  // Depend on a stable hash of habit ids so we don't refetch stats
  // every time the habits array reference changes (e.g. after a toggle).
  const habitIdsKey = habits.map((h) => h.id).join(",");

  // Calculate real stats from Supabase (parallel, not serial).
  useEffect(() => {
    if (habits.length === 0) {
      setHabitStats({});
      return;
    }
    let cancelled = false;
    (async () => {
      const today = getLocalToday();
      const results = await Promise.all(
        habits.map(async (h) => {
          const { streak, completionRate } = await fetchHabitStats(h.id, today);
          return [h.id, { habitId: h.id, streak, completionRate }] as const;
        }),
      );
      if (cancelled) return;
      setHabitStats(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitIdsKey]);

  // Placeholder stats cards — will be backed by real DB queries
  const totalHabits = habits.length;
  const completedToday = habits.filter((h) => h.todayStatus === "done").length;
  const partialToday = habits.filter((h) => h.todayStatus === "partial").length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <SectionHeader
        icon="calendar-check-o"
        title="Сегодня"
        colors={colors}
      />
      <View style={styles.cardsRow}>
        <StatCard
          label="Всего"
          value={totalHabits}
          color={colors.tint}
          bg={colors.surface}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
        <StatCard
          label="Выполнено"
          value={completedToday}
          color={colors.success}
          bg={colors.surface}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
        <StatCard
          label="Частично"
          value={partialToday}
          color={colors.warning}
          bg={colors.surface}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
      </View>

      <SectionHeader
        icon="line-chart"
        title="По привычкам"
        colors={colors}
      />
      {habits.map((h) => {
        const s = habitStats[h.id];
        return (
          <View
            key={h.id}
            style={[styles.habitStat, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.colorDot, { backgroundColor: h.color }]} />
            <View style={styles.habitStatContent}>
              <Text style={[styles.habitStatTitle, { color: colors.text }]}>
                {h.title}
              </Text>
              <Text
                style={[styles.habitStatSub, { color: colors.textSecondary }]}
              >
                Серия: {s ? `${s.streak} дн.` : "—"} · Выполнение:{" "}
                {s ? `${s.completionRate}%` : "—"}
              </Text>
            </View>
          </View>
        );
      })}

      {habits.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Добавьте привычки, чтобы видеть статистику
        </Text>
      )}
    </ScrollView>
  );
}

function SectionHeader({
  icon,
  title,
  colors,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIconWrap,
          { backgroundColor: colors.tint + "18" },
        ]}
      >
        <FontAwesome name={icon} size={14} color={colors.tint} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
  textColor,
  subColor,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  textColor: string;
  subColor: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={[styles.cardLabel, { color: subColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  cardsRow: { flexDirection: "row", gap: Spacing.sm },
  card: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  cardValue: { fontSize: FontSize.xxl, fontWeight: "700" },
  cardLabel: { fontSize: FontSize.xs },
  habitStat: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  habitStatContent: { flex: 1, gap: 2 },
  habitStatTitle: { fontSize: FontSize.md, fontWeight: "600" },
  habitStatSub: { fontSize: FontSize.xs },
  emptyText: { fontSize: FontSize.md, textAlign: "center", marginTop: 48 },
});
