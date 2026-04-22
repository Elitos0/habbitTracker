import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";

export interface TimePickerFieldProps {
  /** Current value in `HH:MM` 24-hour format, or empty string. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Small preset used for compact inline rows (e.g. checklist items). */
  compact?: boolean;
}

function parseHHMM(value: string): Date {
  const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(value);
  const now = new Date();
  if (!match) {
    now.setHours(9, 0, 0, 0);
    return now;
  }
  now.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return now;
}

function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * Cross-platform time picker.
 *
 * - Native (iOS/Android): opens the platform's native time picker.
 * - Web: delegates to `TimePickerField.web.tsx` which renders `<input type="time">`.
 */
export default function TimePickerField({
  value,
  onChange,
  placeholder = "Выбрать время",
  compact = false,
}: TimePickerFieldProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android fires once with 'set' or 'dismissed'; iOS keeps the picker open
    // and fires on every spin, so we accept any change.
    if (Platform.OS === "android") {
      setOpen(false);
      if (event.type === "set" && selected) onChange(formatHHMM(selected));
      return;
    }
    if (selected) onChange(formatHHMM(selected));
  };

  return (
    <View style={compact ? styles.compact : styles.block}>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          compact ? styles.compactField : styles.field,
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
        <Text
          style={{
            color: value ? colors.text : colors.textSecondary,
            fontSize: compact ? FontSize.sm : FontSize.md,
            fontVariant: ["tabular-nums"],
          }}
        >
          {value || placeholder}
        </Text>
        {value && !compact && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onChange("");
            }}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <FontAwesome
              name="times-circle"
              size={16}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </Pressable>

      {open && (
        <DateTimePicker
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          value={parseHHMM(value)}
          onChange={handleChange}
          is24Hour
        />
      )}

      {Platform.OS === "ios" && open && (
        <Pressable
          onPress={() => setOpen(false)}
          style={[styles.doneBtn, { backgroundColor: colors.tint }]}
        >
          <Text style={styles.doneText}>Готово</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignSelf: "flex-start",
  },
  compact: {
    alignSelf: "flex-start",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    minWidth: 140,
  },
  compactField: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 90,
  },
  clearBtn: {
    marginLeft: "auto",
  },
  doneBtn: {
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  doneText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FontSize.sm,
  },
});
