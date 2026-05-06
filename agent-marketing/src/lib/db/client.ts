import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

function createDb(url: string): Db {
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema });
}

let _db: Db | undefined;

export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Missing DATABASE_URL. Set it to a Postgres connection string.");
    }
    _db = createDb(url);
  }
  return _db;
}

export async function migrateDb(db = getDb()): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

export async function createTestDb(): Promise<Db> {
  const baseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("Missing TEST_DATABASE_URL or DATABASE_URL for Postgres repository tests.");
  }

  const databaseName = `agent_marketing_test_${crypto.randomUUID().replaceAll("-", "_")}`;
  const admin = postgres(baseUrl, { prepare: false });

  await admin`create database ${admin(databaseName)}`;
  await admin.end();

  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  const db = createDb(url.toString());
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

export const DEFAULT_USER_ID = "default-user";
