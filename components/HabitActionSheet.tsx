import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";

export type HabitActionSheetProps = {
  visible: boolean;
  habitTitle: string;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
};

/**
 * Bottom-sheet action menu shown after long-pressing a habit card.
 * Cross-platform: same UI on web, iOS and Android.
 */
export default function HabitActionSheet({
  visible,
  habitTitle,
  onArchive,
  onDelete,
  onClose,
}: HabitActionSheetProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={styles.grabber} />
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {habitTitle}
          </Text>

          <Pressable
            style={[styles.action, { borderTopColor: colors.border }]}
            onPress={() => {
              onArchive();
              onClose();
            }}
          >
            <FontAwesome name="archive" size={18} color={colors.text} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              Архивировать
            </Text>
          </Pressable>

          <Pressable
            style={[styles.action, { borderTopColor: colors.border }]}
            onPress={() => {
              onDelete();
              onClose();
            }}
          >
            <FontAwesome name="trash" size={18} color={colors.error} />
            <Text style={[styles.actionLabel, { color: colors.error }]}>
              Удалить
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.cancel,
              { backgroundColor: colors.surfaceSecondary },
            ]}
            onPress={onClose}
          >
            <Text
              style={[styles.cancelLabel, { color: colors.textSecondary }]}
            >
              Отмена
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === "ios" ? Spacing.xl : Spacing.md,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00000022",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "600",
    textAlign: "center",
    paddingBottom: Spacing.sm,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    fontSize: FontSize.md,
    fontWeight: "500",
  },
  cancel: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  cancelLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
