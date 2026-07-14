import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_PATH || "./data/maple.db";
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const globalForDb = globalThis as unknown as { __mapleDb?: ReturnType<typeof create> };

/* `next build`(page data 수집)는 여러 워커가 병렬로 이 모듈을 import한다.
   그 시점에 migrate()가 동시에 CREATE TABLE을 실행하면 충돌하므로, 빌드 단계에서는
   마이그레이션을 건너뛴다. 런타임(standalone 단일 프로세스)에서만 1회 적용된다. */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function create() {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  if (!isBuildPhase) migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export const db = globalForDb.__mapleDb ?? (globalForDb.__mapleDb = create());
