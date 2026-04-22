import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Database } from "./types";

// ─── Secure token storage ───
// Native: expo-secure-store (Keychain / EncryptedSharedPreferences).
// Web: localStorage (Supabase SDK needs a sync-readable place for session bootstrap).

const hasWindow = typeof window !== "undefined";

const WebStorageAdapter = {
  getItem: async (key: string): Promise<string | null> =>
    hasWindow ? window.localStorage.getItem(key) : null,
  setItem: async (key: string, value: string): Promise<void> => {
    if (hasWindow) window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (hasWindow) window.localStorage.removeItem(key);
  },
};

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const storage = Platform.OS === "web" ? WebStorageAdapter : SecureStoreAdapter;

// ─── Config ───

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Keep the app bootable so developers can see the login screen with a clear
  // error rather than a white screen, but shout loudly in the console.
  console.warn(
    "[Supabase] EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are not set.",
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-anon-key",
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
      flowType: "pkce",
    },
  },
);

/** Strip OAuth hash/query after successful sign-in (web only). */
export function cleanAuthUrl(): void {
  if (Platform.OS !== "web" || !hasWindow) return;
  const { pathname } = window.location;
  window.history.replaceState(null, "", pathname);
}
