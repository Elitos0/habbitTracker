// Re-export from the Supabase-backed store.
// The old SQLite store code has been moved to habitsStore.sqlite.ts for offline fallback.
export { useHabitsStore } from "./habitsStore.supabase";
