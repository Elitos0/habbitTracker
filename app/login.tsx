import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/src/auth/AuthContext";

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message ?? "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo / Icon */}
        <View
          style={[styles.iconCircle, { backgroundColor: colors.tint + "15" }]}
        >
          <FontAwesome name="leaf" size={48} color={colors.tint} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Трекер привычек
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Войдите, чтобы синхронизировать{"\n"}привычки между устройствами
        </Text>

        {/* Google Sign-In Button */}
        <Pressable
          onPress={handleGoogleSignIn}
          disabled={loading}
          style={[
            styles.googleBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <>
              <View style={styles.googleIconWrap}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={[styles.googleBtnText, { color: colors.text }]}>
                Войти через Google
              </Text>
            </>
          )}
        </Pressable>

        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  content: {
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl + Spacing.md,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 52,
  },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
  },
  googleIcon: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  googleBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  errorText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
