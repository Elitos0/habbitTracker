import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { CREATE_TABLES_SQL, SEED_SCHEMA_VERSION_SQL } from "./schema";

const DB_NAME = "habits.db";

let _db: SQLite.SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initDatabase(dbName: string): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(dbName);
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync(CREATE_TABLES_SQL);
  await db.execAsync(SEED_SCHEMA_VERSION_SQL);
  // Schema v2: add scheduled_time to habits
  try {
    await db.execAsync("ALTER TABLE habits ADD COLUMN scheduled_time TEXT;");
  } catch {
    // Column already exists
  }
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_dbPromise) return _dbPromise;
  _dbPromise = (async () => {
    try {
      const db = await initDatabase(DB_NAME);
      _db = db;
      return db;
    } catch (err) {
      // On web, OPFS can get corrupted after unclean shutdown.
      // Fall back to in-memory database to keep the app usable.
      if (Platform.OS === "web") {
        console.warn(
          "[DB] OPFS open failed, falling back to in-memory DB:",
          err,
        );
        const db = await initDatabase(":memory:");
        _db = db;
        return db;
      }
      throw err;
    }
  })();
  return _dbPromise;
}

/** Generate a v4-style UUID using Math.random (good enough for local IDs). */
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}
