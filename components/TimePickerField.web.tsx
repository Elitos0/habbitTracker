import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";

export interface TimePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
}

/**
 * Web time picker.
 *
 * Renders a native `<input type="time">` — browsers provide a fully
 * accessible picker with keyboard and mouse support, correct localization,
 * and no manual `HH:MM` typing. We overlay a styled button on top of a
 * transparent but clickable `<input>` so the field still matches the
 * app's visual language.
 */
export default function TimePickerField({
  value,
  onChange,
  placeholder = "Выбрать время",
  compact = false,
}: TimePickerFieldProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // Safari <17 / older Firefox: fall back to focus+click.
      }
    }
    el.focus();
    el.click();
  }, []);

  return (
    <View
      style={[
        compact ? styles.compactWrap : styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <FontAwesome
        name="clock-o"
        size={14}
        color={value ? colors.text : colors.textSecondary}
      />
      <input
        ref={inputRef}
        type="time"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          color: value ? (colors.text as string) : (colors.textSecondary as string),
          fontSize: compact ? FontSize.sm : FontSize.md,
          fontFamily: "inherit",
          cursor: "pointer",
          minWidth: 90,
          fontVariantNumeric: "tabular-nums",
        }}
      />
      {/* Keep a visible caret affordance for browsers that hide the native icon */}
      <Pressable onPress={openPicker} hitSlop={6}>
        <FontAwesome name="caret-down" size={14} color={colors.textSecondary} />
      </Pressable>
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          hitSlop={6}
          style={styles.clearBtn}
        >
          <FontAwesome
            name="times-circle"
            size={14}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    minWidth: 140,
  },
  compactWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 100,
  },
  clearBtn: {
    marginLeft: "auto",
  },
});
