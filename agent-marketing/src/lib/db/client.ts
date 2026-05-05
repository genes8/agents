import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

function createDb(url: string) {
  const sqlite = new Database(url);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return db;
}

let _db: Db | undefined;

export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL ?? "local.db";
    _db = createDb(url);
    migrate(_db, { migrationsFolder: "./drizzle" });
  }
  return _db;
}

export function createTestDb(): Db {
  const db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

export const DEFAULT_USER_ID = "default-user";
