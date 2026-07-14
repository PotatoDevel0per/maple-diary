import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bossMonths, bossWeeks, cashBook, equips, hunts, ledger, levelLog, settings } from "@/db/schema";
import type { BossMonthChar, BossWeekChar, DiaryState, Kind, LevelEntry } from "@/lib/types";

export type SettingsRow = typeof settings.$inferSelect;

/** 설정 행이 없으면 기본값으로 생성 후 반환 */
export function ensureSettings(userId: string): SettingsRow {
  const row = db.select().from(settings).where(eq(settings.userId, userId)).get();
  if (row) return row;
  return db.insert(settings).values({ userId }).returning().get();
}

export function loadState(userId: string): DiaryState {
  const s = ensureSettings(userId);
  const huntRows = db.select().from(hunts).where(eq(hunts.userId, userId)).all();
  const ledgerRows = db.select().from(ledger).where(eq(ledger.userId, userId)).all();
  const cashRows = db.select().from(cashBook).where(eq(cashBook.userId, userId)).all();
  const equipRows = db.select().from(equips).where(eq(equips.userId, userId)).all();
  const weekRows = db.select().from(bossWeeks).where(eq(bossWeeks.userId, userId)).all();
  const monthRows = db.select().from(bossMonths).where(eq(bossMonths.userId, userId)).all();
  const levelRows = db.select().from(levelLog).where(eq(levelLog.userId, userId)).all();

  const bw: Record<string, BossWeekChar[]> = {};
  for (const r of weekRows) bw[r.weekKey] = JSON.parse(r.chars);
  const bm: Record<string, BossMonthChar[]> = {};
  for (const r of monthRows) bm[r.monthKey] = JSON.parse(r.chars);
  const lv: Record<string, LevelEntry> = {};
  for (const r of levelRows) lv[r.date] = { level: r.level, rate: r.rate, ...(r.live ? { live: true } : {}) };

  return {
    profile: { name: s.name, greet: s.greet },
    goal: s.goal,
    solPrice: s.solPrice,
    mktPrice: s.mktPrice,
    cashPrice: s.cashPrice,
    hasNexonKey: !!s.nexonKey,
    mapleName: s.mapleName,
    charImage: s.charImage,
    hunts: huntRows.map(({ userId: _u, ...h }) => h),
    expenses: ledgerRows.map(({ userId: _u, ...e }) => ({ ...e, kind: e.kind as Kind })),
    cash: cashRows.map(({ userId: _u, ...e }) => ({ ...e, kind: e.kind as Kind })),
    equips: equipRows.map(({ userId: _u, ...e }) => e),
    bossWeeks: bw,
    bossMonths: bm,
    levelLog: lv,
  };
}
