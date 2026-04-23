import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/src/auth/AuthContext";

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { user, signOut } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {user?.email ? (
        <View style={[styles.profile, { backgroundColor: colors.surface }]}>
          <View
            style={[styles.avatar, { backgroundColor: colors.tint + "22" }]}
          >
            <FontAwesome name="user" size={20} color={colors.tint} />
          </View>
          <View style={styles.profileText}>
            <Text
              style={[styles.profileLabel, { color: colors.textSecondary }]}
            >
              Вошли как
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.text }]}
              numberOfLines={1}
            >
              {user.email}
            </Text>
          </View>
        </View>
      ) : null}

      <SettingsGroup title="Привычки" icon="list-ul" colors={colors}>
        <SettingsRow
          icon="archive"
          label="Архив"
          colors={colors}
          onPress={() => router.push("/archive")}
        />
      </SettingsGroup>

      <SettingsGroup title="Данные" icon="database" colors={colors}>
        <SettingsRow
          icon="download"
          label="Экспорт данных"
          colors={colors}
          disabled
          onPress={() => {}}
        />
        <Divider color={colors.border} />
        <SettingsRow
          icon="upload"
          label="Импорт данных"
          colors={colors}
          disabled
          onPress={() => {}}
        />
      </SettingsGroup>

      <SettingsGroup title="Уведомления" icon="bell-o" colors={colors}>
        <SettingsRow
          icon="bell"
          label="Настройка напоминаний"
          colors={colors}
          disabled
          onPress={() => {}}
        />
      </SettingsGroup>

      <SettingsGroup title="О приложении" icon="info-circle" colors={colors}>
        <View style={styles.row}>
          <FontAwesome
            name="code"
            size={18}
            color={colors.tint}
            style={styles.rowIcon}
          />
          <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
            Версия
          </Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
            1.0.0
          </Text>
        </View>
      </SettingsGroup>

      <Pressable
        style={[
          styles.signOutBtn,
          { backgroundColor: colors.error + "15", borderColor: colors.error },
        ]}
        onPress={() => setConfirmSignOut(true)}
      >
        <FontAwesome name="sign-out" size={16} color={colors.error} />
        <Text style={[styles.signOutLabel, { color: colors.error }]}>
          Выйти
        </Text>
      </Pressable>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Выйти из аккаунта?"
        message="Локальный сеанс будет завершён. Данные на сервере сохранятся."
        confirmLabel="Выйти"
        destructive
        onConfirm={() => {
          setConfirmSignOut(false);
          signOut();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </ScrollView>
  );
}

function SettingsGroup({
  title,
  icon,
  colors,
  children,
}: {
  title: string;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  colors: (typeof Colors)["light"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        {icon ? (
          <FontAwesome
            name={icon}
            size={12}
            color={colors.tint}
            style={styles.groupHeaderIcon}
          />
        ) : null}
        <Text style={[styles.groupTitle, { color: colors.tint }]}>
          {title}
        </Text>
      </View>
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
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  colors: (typeof Colors)["light"];
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && { backgroundColor: colors.surfaceSecondary },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <FontAwesome
        name={icon}
        size={18}
        color={disabled ? colors.tabIconDefault : colors.tint}
        style={styles.rowIcon}
      />
      <Text
        style={[
          styles.rowLabel,
          { color: disabled ? colors.textSecondary : colors.text, flex: 1 },
        ]}
      >
        {label}
      </Text>
      {disabled ? (
        <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
          скоро
        </Text>
      ) : (
        <FontAwesome
          name="chevron-right"
          size={14}
          color={colors.tabIconDefault}
        />
      )}
    </Pressable>
  );
}

function Divider({ color }: { color: string }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: color,
        marginLeft: Spacing.md + 28,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: { flex: 1, gap: 2 },
  profileLabel: { fontSize: FontSize.xs },
  profileEmail: { fontSize: FontSize.md, fontWeight: "600" },
  group: { marginBottom: Spacing.lg },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + 2,
    marginBottom: Spacing.xs + 2,
    paddingLeft: Spacing.xs,
  },
  groupHeaderIcon: { marginBottom: 1 },
  groupTitle: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  groupCard: { borderRadius: Radius.md, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowIcon: { width: 24, textAlign: "center" },
  rowLabel: { fontSize: FontSize.md },
  rowValue: { fontSize: FontSize.sm },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  signOutLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
