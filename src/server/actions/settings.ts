"use server";

import { eq } from "drizzle-orm";
import { requireUserId } from "@/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { ensureSettings } from "@/server/state";
import { nxGet } from "@/server/nexon";

export async function saveProfile(name: string, greet: string) {
  const userId = await requireUserId();
  ensureSettings(userId);
  const patch = {
    name: String(name ?? "").trim().slice(0, 30) || "용사",
    greet: String(greet ?? "").trim().slice(0, 60) || "오늘도 재획 화이팅",
  };
  db.update(settings).set(patch).where(eq(settings.userId, userId)).run();
  return patch;
}

export async function saveGoal(goal: number) {
  const userId = await requireUserId();
  ensureSettings(userId);
  const v = Math.round(Number(goal));
  const clean = Number.isFinite(v) && v > 0 ? v : 0;
  db.update(settings).set({ goal: clean }).where(eq(settings.userId, userId)).run();
  return clean;
}

export async function savePrices(input: { mktPrice?: number; cashPrice?: number; solPrice?: number }) {
  const userId = await requireUserId();
  const cur = ensureSettings(userId);
  const clean = (v: unknown, fallback: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const patch = {
    mktPrice: clean(input.mktPrice, cur.mktPrice),
    cashPrice: clean(input.cashPrice, cur.cashPrice),
    solPrice: clean(input.solPrice, cur.solPrice),
  };
  db.update(settings).set(patch).where(eq(settings.userId, userId)).run();
  return patch;
}

/** keyInput이 빈 문자열이면 기존 키 유지. 닉네임이 바뀌면 ocid/이미지 초기화 */
export async function saveNexon(keyInput: string, name: string) {
  const userId = await requireUserId();
  const cur = ensureSettings(userId);
  const newKey = String(keyInput ?? "").trim() || cur.nexonKey;
  const newName = String(name ?? "").trim().slice(0, 30);
  const nameChanged = newName !== cur.mapleName;
  const patch: Partial<typeof cur> = { nexonKey: newKey, mapleName: newName };
  if (nameChanged) Object.assign(patch, { ocid: "", ocidName: "", charImage: "" });
  db.update(settings).set(patch).where(eq(settings.userId, userId)).run();

  let charImage = nameChanged ? "" : cur.charImage;
  if (newKey && newName) {
    try {
      const j = await nxGet(newKey, "/maplestory/v1/id", { character_name: newName });
      const basic = await nxGet(newKey, "/maplestory/v1/character/basic", { ocid: j.ocid });
      charImage = basic.character_image || "";
      db.update(settings)
        .set({ ocid: j.ocid, ocidName: newName, charImage })
        .where(eq(settings.userId, userId))
        .run();
    } catch {
      /* 키/닉네임이 잘못됐어도 저장 자체는 유지 */
    }
  }
  return { hasNexonKey: !!newKey, mapleName: newName, charImage };
}
