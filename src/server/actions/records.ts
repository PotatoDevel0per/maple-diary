"use server";

import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/auth";
import { db } from "@/db";
import { bossMonths, bossWeeks, cashBook, equips, hunts, ledger, settings } from "@/db/schema";
import type { BossMonthChar, BossWeekChar, CashEntry, Equip, Hunt, LedgerEntry } from "@/lib/types";
import { uid } from "@/lib/format";

const cleanInt = (v: unknown, min = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min ? n : min;
};
const cleanDate = (v: unknown) => {
  const s = String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("날짜가 올바르지 않아요");
  return s;
};
const cleanKind = (v: unknown): "in" | "out" => (v === "in" ? "in" : "out");

/* ---------- 사냥 ---------- */
export async function addHunt(input: Omit<Hunt, "id">): Promise<Hunt> {
  const userId = await requireUserId();
  const row: Hunt = {
    id: uid(),
    date: cleanDate(input.date),
    sojaebi: cleanInt(input.sojaebi),
    meso: cleanInt(input.meso),
    sol: cleanInt(input.sol),
    memo: String(input.memo ?? "").slice(0, 200),
  };
  db.insert(hunts).values({ ...row, userId }).run();
  return row;
}
export async function deleteHunt(id: string) {
  const userId = await requireUserId();
  db.delete(hunts).where(and(eq(hunts.userId, userId), eq(hunts.id, id))).run();
}

/* 보유 자산 보정: 현재 값과 입력 값의 차익(메소·조각)을 사냥 기록으로 남긴다.
   메소·조각이 함께 담기고 음수(사용·소모)도 허용해야 하므로 addHunt와 분리. */
export async function addAssetAdjustment(input: { date: string; mesoDiff: number; solDiff: number }): Promise<Hunt> {
  const userId = await requireUserId();
  const toInt = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? n : 0;
  };
  const row: Hunt = {
    id: uid(),
    date: cleanDate(input.date),
    sojaebi: 0,
    meso: toInt(input.mesoDiff),
    sol: toInt(input.solDiff),
    memo: "자산 보정",
  };
  db.insert(hunts).values({ ...row, userId }).run();
  return row;
}

/* ---------- 가계부 (게임 메소) ---------- */
export async function addLedger(input: Omit<LedgerEntry, "id">): Promise<LedgerEntry> {
  const userId = await requireUserId();
  const row: LedgerEntry = {
    id: uid(),
    date: cleanDate(input.date),
    kind: cleanKind(input.kind),
    cat: String(input.cat ?? "기타").slice(0, 30),
    title: String(input.title ?? "").slice(0, 100),
    amount: cleanInt(input.amount),
  };
  db.insert(ledger).values({ ...row, userId }).run();
  return row;
}
export async function deleteLedger(id: string) {
  const userId = await requireUserId();
  db.delete(ledger).where(and(eq(ledger.userId, userId), eq(ledger.id, id))).run();
}

/* ---------- 쌀 장부 (원화) ---------- */
export async function addCash(input: Omit<CashEntry, "id">): Promise<CashEntry> {
  const userId = await requireUserId();
  const row: CashEntry = {
    id: uid(),
    date: cleanDate(input.date),
    kind: cleanKind(input.kind),
    cat: String(input.cat ?? "기타").slice(0, 30),
    title: String(input.title ?? "").slice(0, 100),
    amount: cleanInt(input.amount),
  };
  db.insert(cashBook).values({ ...row, userId }).run();
  return row;
}
export async function deleteCash(id: string) {
  const userId = await requireUserId();
  db.delete(cashBook).where(and(eq(cashBook.userId, userId), eq(cashBook.id, id))).run();
}

/* ---------- 장비 ---------- */
export async function addEquip(input: Omit<Equip, "id">): Promise<Equip> {
  const userId = await requireUserId();
  const row: Equip = {
    id: uid(),
    name: String(input.name ?? "").slice(0, 60),
    part: String(input.part ?? "장신구").slice(0, 20),
    memo: String(input.memo ?? "").slice(0, 200),
    buyDate: cleanDate(input.buyDate),
    buyPrice: cleanInt(input.buyPrice),
    buyMkt: cleanInt(input.buyMkt),
    buyRice: cleanInt(input.buyRice),
    tariff: !!input.tariff,
    sellDate: "",
    sellPrice: null,
    sellMkt: null,
    sellRice: null,
  };
  if (!row.name) throw new Error("아이템 이름을 입력하세요");
  db.insert(equips).values({ ...row, userId }).run();
  /* 최근 입력 시세를 다음 프리필용으로 기억 (레거시 동작 유지) */
  db.update(settings)
    .set({ ...(row.buyMkt ? { mktPrice: row.buyMkt } : {}), ...(row.buyRice ? { cashPrice: row.buyRice } : {}) })
    .where(eq(settings.userId, userId))
    .run();
  return row;
}

export async function sellEquip(id: string, input: { sellDate: string; sellPrice: number; sellMkt: number; sellRice: number }) {
  const userId = await requireUserId();
  const patch = {
    sellDate: cleanDate(input.sellDate),
    sellPrice: cleanInt(input.sellPrice),
    sellMkt: cleanInt(input.sellMkt),
    sellRice: cleanInt(input.sellRice),
  };
  db.update(equips).set(patch).where(and(eq(equips.userId, userId), eq(equips.id, id))).run();
  db.update(settings)
    .set({ ...(patch.sellMkt ? { mktPrice: patch.sellMkt } : {}), ...(patch.sellRice ? { cashPrice: patch.sellRice } : {}) })
    .where(eq(settings.userId, userId))
    .run();
  return patch;
}

export async function deleteEquip(id: string) {
  const userId = await requireUserId();
  db.delete(equips).where(and(eq(equips.userId, userId), eq(equips.id, id))).run();
}

/* ---------- 보스: 주차/월 캐릭터 슬롯 전체 upsert ---------- */
export async function saveBossWeek(weekKey: string, chars: BossWeekChar[]) {
  const userId = await requireUserId();
  cleanDate(weekKey);
  db.insert(bossWeeks)
    .values({ userId, weekKey, chars: JSON.stringify(chars) })
    .onConflictDoUpdate({ target: [bossWeeks.userId, bossWeeks.weekKey], set: { chars: JSON.stringify(chars) } })
    .run();
}

export async function saveBossMonth(monthKey: string, chars: BossMonthChar[]) {
  const userId = await requireUserId();
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error("월 키가 올바르지 않아요");
  db.insert(bossMonths)
    .values({ userId, monthKey, chars: JSON.stringify(chars) })
    .onConflictDoUpdate({ target: [bossMonths.userId, bossMonths.monthKey], set: { chars: JSON.stringify(chars) } })
    .run();
}
