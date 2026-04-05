import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <SettingsGroup title="Данные" colors={colors}>
        <SettingsRow
          icon="download"
          label="Экспорт данных"
          colors={colors}
          onPress={() => {}}
        />
        <SettingsRow
          icon="upload"
          label="Импорт данных"
          colors={colors}
          onPress={() => {}}
        />
      </SettingsGroup>

      <SettingsGroup title="Уведомления" colors={colors}>
        <SettingsRow
          icon="bell"
          label="Настройка напоминаний"
          colors={colors}
          onPress={() => {}}
        />
      </SettingsGroup>

      <SettingsGroup title="О приложении" colors={colors}>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
            Версия
          </Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>1.0.0</Text>
        </View>
      </SettingsGroup>
    </ScrollView>
  );
}

function SettingsGroup({
  title,
  colors,
  children,
}: {
  title: string;
  colors: (typeof Colors)["light"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  colors: (typeof Colors)["light"];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <FontAwesome
        name={icon}
        size={18}
        color={colors.tint}
        style={{ width: 28 }}
      />
      <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
        {label}
      </Text>
      <FontAwesome
        name="chevron-right"
        size={14}
        color={colors.tabIconDefault}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.md },
  group: { marginBottom: Spacing.lg },
  groupTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  groupCard: { borderRadius: Radius.md, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowLabel: { fontSize: FontSize.md },
  rowValue: { fontSize: FontSize.md },
});
