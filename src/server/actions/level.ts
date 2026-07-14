"use server";

import { eq } from "drizzle-orm";
import { requireUserId } from "@/auth";
import { db } from "@/db";
import { levelLog, settings } from "@/db/schema";
import { ensureSettings } from "@/server/state";
import { NX_MIN_DATE, nxGet } from "@/server/nexon";
import { dsOf } from "@/lib/format";
import type { LevelEntry } from "@/lib/types";

async function ensureOcid(userId: string): Promise<{ key: string; ocid: string; name: string }> {
  const s = ensureSettings(userId);
  const key = s.nexonKey.trim();
  const name = s.mapleName.trim();
  if (!key || !name) throw new Error("설정 탭에서 API 키와 닉네임을 먼저 저장하세요");
  if (s.ocid && s.ocidName === name) return { key, ocid: s.ocid, name };
  const j = await nxGet(key, "/maplestory/v1/id", { character_name: name });
  db.update(settings).set({ ocid: j.ocid, ocidName: name }).where(eq(settings.userId, userId)).run();
  return { key, ocid: j.ocid, name };
}

function upsertLevel(userId: string, date: string, entry: LevelEntry) {
  db.insert(levelLog)
    .values({ userId, date, level: entry.level, rate: entry.rate, live: !!entry.live })
    .onConflictDoUpdate({
      target: [levelLog.userId, levelLog.date],
      set: { level: entry.level, rate: entry.rate, live: !!entry.live },
    })
    .run();
}

/** 현재 시점 기록 (live=true) */
export async function fetchLevelNow(): Promise<{ date: string; entry: LevelEntry }> {
  const userId = await requireUserId();
  const { key, ocid } = await ensureOcid(userId);
  const b = await nxGet(key, "/maplestory/v1/character/basic", { ocid });
  const d = new Date();
  const date = dsOf(d.getFullYear(), d.getMonth(), d.getDate());
  const entry: LevelEntry = { level: b.character_level, rate: parseFloat(b.character_exp_rate) || 0, live: true };
  upsertLevel(userId, date, entry);
  if (b.character_image) db.update(settings).set({ charImage: b.character_image }).where(eq(settings.userId, userId)).run();
  return { date, entry };
}

/** 과거 N일 조회. 확정 기록(live=false)은 건너뛰어 이어받기. */
export async function fetchLevels(days = 30): Promise<{ got: number; fail: number; log: Record<string, LevelEntry> }> {
  const userId = await requireUserId();
  const { key, ocid } = await ensureOcid(userId);
  const existing = db.select().from(levelLog).where(eq(levelLog.userId, userId)).all();
  const have = new Map(existing.map((r) => [r.date, r.live]));

  let got = 0,
    fail = 0,
    consec = 0;
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = dsOf(d.getFullYear(), d.getMonth(), d.getDate());
    if (ds < NX_MIN_DATE) break;
    if (have.has(ds) && !have.get(ds)) {
      consec = 0;
      continue;
    } /* 확정 기록은 스킵 */
    try {
      const b = await nxGet(key, "/maplestory/v1/character/basic", { ocid, date: ds });
      upsertLevel(userId, ds, { level: b.character_level, rate: parseFloat(b.character_exp_rate) || 0 });
      if (b.character_image) db.update(settings).set({ charImage: b.character_image }).where(eq(settings.userId, userId)).run();
      got++;
      consec = 0;
    } catch {
      fail++;
      consec++;
      if (consec >= 10) break; /* 연속 실패 → 캐릭터 생성 이전이거나 한도 초과 */
    }
    await new Promise((r) => setTimeout(r, 130));
  }

  const rows = db.select().from(levelLog).where(eq(levelLog.userId, userId)).all();
  const log: Record<string, LevelEntry> = {};
  for (const r of rows) log[r.date] = { level: r.level, rate: r.rate, ...(r.live ? { live: true } : {}) };
  return { got, fail, log };
}
