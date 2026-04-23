import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Simple cross-platform confirm dialog for destructive actions.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const accent = destructive ? colors.error : colors.tint;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? (
            <Text
              style={[styles.message, { color: colors.textSecondary }]}
            >
              {message}
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={onCancel}
            >
              <Text
                style={[styles.buttonLabel, { color: colors.textSecondary }]}
              >
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: accent }]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonLabel, { color: "#ffffff" }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  buttonLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
