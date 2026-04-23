import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import type { HabitWithDetails } from "@/src/domain/habits";
import { useHabitsStore } from "@/src/store/habitsStore";

export default function ArchiveScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { loadArchivedHabits, unarchiveHabit, deleteHabit } = useHabitsStore();

  const [items, setItems] = useState<HabitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] =
    useState<HabitWithDetails | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await loadArchivedHabits();
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [loadArchivedHabits]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRestore = async (habitId: string) => {
    await unarchiveHabit(habitId);
    await refresh();
  };

  const handleDelete = async (habitId: string) => {
    await deleteHabit(habitId);
    await refresh();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Архив" }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <FontAwesome
            name="archive"
            size={48}
            color={colors.tabIconDefault}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Архив пуст
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            Заархивированные привычки появятся здесь и их можно будет
            восстановить
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(h) => h.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderLeftColor: item.color,
                },
              ]}
            >
              <View style={styles.cardMain}>
                <Text
                  style={[styles.cardTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {item.tags.map((tag) => (
                      <View
                        key={tag.id}
                        style={[
                          styles.tagChip,
                          {
                            backgroundColor: (tag.color ?? colors.textSecondary)
                              + "20",
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
                )}
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.tint + "18" },
                  ]}
                  onPress={() => handleRestore(item.id)}
                >
                  <FontAwesome name="undo" size={14} color={colors.tint} />
                  <Text
                    style={[styles.actionLabel, { color: colors.tint }]}
                  >
                    Восстановить
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.error + "18" },
                  ]}
                  onPress={() => setConfirmDelete(item)}
                >
                  <FontAwesome name="trash" size={14} color={colors.error} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <ConfirmDialog
        visible={confirmDelete !== null}
        title="Удалить навсегда?"
        message={
          confirmDelete
            ? `«${confirmDelete.title}» будет удалена без возможности восстановления.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        onConfirm={async () => {
          const target = confirmDelete;
          setConfirmDelete(null);
          if (target) {
            try {
              await handleDelete(target.id);
            } catch (err) {
              console.warn("[archive:delete]", err);
            }
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    gap: Spacing.sm,
  },
  cardMain: { flex: 1, gap: Spacing.xs },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: FontSize.xs,
  },
  actions: { flexDirection: "row", gap: Spacing.xs },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  actionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
});
