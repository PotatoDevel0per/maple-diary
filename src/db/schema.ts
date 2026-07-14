import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ---------- Auth.js 표준 테이블 ---------- */
export const users = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

/* ---------- 사용자 설정 (프로필·시세·넥슨 연동) ---------- */
export const settings = sqliteTable("settings", {
  userId: text("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("용사"),
  greet: text("greet").notNull().default("오늘도 재획 화이팅"),
  goal: integer("goal").notNull().default(0),          /* 월 목표 (메소) */
  solPrice: integer("solPrice").notNull().default(5700000), /* 솔 조각 시세 (메소/개) */
  mktPrice: integer("mktPrice").notNull().default(2600),    /* 메소마켓 (1억당 메포) */
  cashPrice: integer("cashPrice").notNull().default(1900),  /* 쌀 시세 (1억당 원) */
  nexonKey: text("nexonKey").notNull().default(""),
  mapleName: text("mapleName").notNull().default(""),
  ocid: text("ocid").notNull().default(""),
  ocidName: text("ocidName").notNull().default(""),
  charImage: text("charImage").notNull().default(""),
});

/* ---------- 사냥 기록 (메소 단위: raw 메소) ---------- */
export const hunts = sqliteTable("hunt", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),          /* YYYY-MM-DD */
  sojaebi: integer("sojaebi").notNull().default(0),
  meso: integer("meso").notNull().default(0),
  sol: integer("sol").notNull().default(0),
  memo: text("memo").notNull().default(""),
});

/* ---------- 가계부 (게임 메소, kind: in/out) ---------- */
export const ledger = sqliteTable("ledger", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  kind: text("kind").notNull(),          /* 'in' | 'out' */
  cat: text("cat").notNull().default("기타"),
  title: text("title").notNull().default(""),
  amount: integer("amount").notNull().default(0), /* raw 메소 */
});

/* ---------- 쌀 장부 (현금 원화, kind: in/out) ---------- */
export const cashBook = sqliteTable("cash", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  kind: text("kind").notNull(),
  cat: text("cat").notNull().default("기타"),
  title: text("title").notNull().default(""),
  amount: integer("amount").notNull().default(0), /* 원 */
});

/* ---------- 장비 ---------- */
export const equips = sqliteTable("equip", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  part: text("part").notNull().default("장신구"),
  memo: text("memo").notNull().default(""),
  buyDate: text("buyDate").notNull().default(""),
  buyPrice: integer("buyPrice").notNull().default(0), /* raw 메소 */
  buyMkt: integer("buyMkt").notNull().default(0),
  buyRice: integer("buyRice").notNull().default(0),
  tariff: integer("tariff", { mode: "boolean" }).notNull().default(false),
  sellDate: text("sellDate").notNull().default(""),
  sellPrice: integer("sellPrice"),                    /* null = 미평가 */
  sellMkt: integer("sellMkt"),
  sellRice: integer("sellRice"),
});

/* ---------- 보스: 주차/월 단위 캐릭터 슬롯(JSON) ---------- */
export const bossWeeks = sqliteTable(
  "boss_week",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    weekKey: text("weekKey").notNull(),  /* 주차 시작 목요일 YYYY-MM-DD */
    chars: text("chars").notNull().default("[]"), /* BossWeekChar[] JSON */
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekKey] })]
);

export const bossMonths = sqliteTable(
  "boss_month",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    monthKey: text("monthKey").notNull(), /* YYYY-MM */
    chars: text("chars").notNull().default("[]"), /* BossMonthChar[] JSON */
  },
  (t) => [primaryKey({ columns: [t.userId, t.monthKey] })]
);

/* ---------- 레벨 로그 (Nexon API) ---------- */
export const levelLog = sqliteTable(
  "level_log",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    level: integer("level").notNull(),
    rate: real("rate").notNull(),
    live: integer("live", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })]
);
