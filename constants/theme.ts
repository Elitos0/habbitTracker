// Habit Tracker design tokens

export const Colors: Record<
  "light" | "dark",
  {
    text: string;
    textSecondary: string;
    background: string;
    surface: string;
    surfaceSecondary: string;
    border: string;
    tint: string;
    tintLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    tabIconDefault: string;
    tabIconSelected: string;
    shadow: string;
  }
> = {
  light: {
    text: "#1a1a2e",
    textSecondary: "#6b7280",
    background: "#f8f9fa",
    surface: "#ffffff",
    surfaceSecondary: "#f0f1f3",
    border: "#e5e7eb",
    tint: "#6366f1",
    tintLight: "#a5b4fc",
    success: "#22c55e",
    successLight: "#bbf7d0",
    warning: "#f59e0b",
    warningLight: "#fde68a",
    error: "#ef4444",
    tabIconDefault: "#9ca3af",
    tabIconSelected: "#6366f1",
    shadow: "rgba(0,0,0,0.08)",
  },
  dark: {
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    background: "#0f172a",
    surface: "#1e293b",
    surfaceSecondary: "#334155",
    border: "#334155",
    tint: "#818cf8",
    tintLight: "#4f46e5",
    success: "#4ade80",
    successLight: "#166534",
    warning: "#fbbf24",
    warningLight: "#92400e",
    error: "#f87171",
    tabIconDefault: "#64748b",
    tabIconSelected: "#818cf8",
    shadow: "rgba(0,0,0,0.3)",
  },
};

export type ColorScheme = "light" | "dark";

// Pre-defined habit colors for the color picker
export const HABIT_COLORS: string[] = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#78716c", // stone
];

// Default tags
export const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: "Здоровье", color: "#22c55e" },
  { name: "Учёба", color: "#3b82f6" },
  { name: "Спорт", color: "#f97316" },
  { name: "Работа", color: "#8b5cf6" },
  { name: "Отдых", color: "#06b6d4" },
];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;
