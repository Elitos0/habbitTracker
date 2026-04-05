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

  // Calculate real stats from Supabase
  useEffect(() => {
    if (habits.length === 0) return;
    (async () => {
      const today = getLocalToday();
      const stats: Record<string, HabitStats> = {};

      for (const h of habits) {
        const { streak, completionRate } = await fetchHabitStats(h.id, today);
        stats[h.id] = { habitId: h.id, streak, completionRate };
      }

      setHabitStats(stats);
    })();
  }, [habits]);

  // Placeholder stats cards — will be backed by real DB queries
  const totalHabits = habits.length;
  const completedToday = habits.filter((h) => h.todayStatus === "done").length;
  const partialToday = habits.filter((h) => h.todayStatus === "partial").length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Сегодня</Text>
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

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        По привычкам
      </Text>
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
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
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
