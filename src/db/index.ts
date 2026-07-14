import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_PATH || "./data/maple.db";
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const globalForDb = globalThis as unknown as { __mapleDb?: ReturnType<typeof create> };

function create() {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export const db = globalForDb.__mapleDb ?? (globalForDb.__mapleDb = create());
