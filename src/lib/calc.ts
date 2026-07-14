import { BOSS_MONTHLY, BOSS_WEEKLY } from "./boss-data";
import { dsOf, monthKey, monthThursdays, todayStr } from "./format";
import type { BossMonthChar, BossWeekChar, DiaryState, Equip, Hunt, LevelEntry } from "./types";

export const huntNet = (h: Hunt, solPrice: number) => h.meso + (h.sol || 0) * solPrice;

export function dailyNet(s: DiaryState, ds: string): number {
  const rev = s.hunts.filter((h) => h.date === ds).reduce((sum, h) => sum + huntNet(h, s.solPrice), 0);
  const led = s.expenses.filter((e) => e.date === ds);
  const inc = led.filter((e) => e.kind === "in").reduce((sum, e) => sum + e.amount, 0);
  const out = led.filter((e) => e.kind !== "in").reduce((sum, e) => sum + e.amount, 0);
  return rev + inc - out;
}

export function last7(s: DiaryState): { date: string; label: string; net: number }[] {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = dsOf(d.getFullYear(), d.getMonth(), d.getDate());
    out.push({
      date: ds,
      label: String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"),
      net: dailyNet(s, ds),
    });
  }
  return out;
}

export function inThisMonth(ds: string): boolean {
  const now = new Date();
  const d = new Date(ds + "T00:00:00");
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/* ---------- 보스 집계 ---------- */
export function charTotal(ch: BossWeekChar): { sum: number; count: number } {
  let sum = 0,
    count = 0;
  for (const b of BOSS_WEEKLY) {
    const sel = ch.weekly[b.id];
    if (sel && sel.diff && b.diffs[sel.diff] != null) {
      sum += b.noCount ? b.diffs[sel.diff] : Math.floor(b.diffs[sel.diff] / (sel.party || 1));
      if (!b.noCount) count++;
    }
  }
  return { sum, count };
}

export function weekChars(s: DiaryState, key: string): BossWeekChar[] {
  const chars = s.bossWeeks[key];
  return chars && chars.length ? chars : [{ id: "main", name: "주 캐릭터", weekly: {} }];
}

export function weekTotal(s: DiaryState, key: string): { sum: number; count: number } {
  let sum = 0,
    count = 0;
  for (const ch of weekChars(s, key)) {
    const t = charTotal(ch);
    sum += t.sum;
    count += t.count;
  }
  return { sum, count };
}

export function monthChars(s: DiaryState, mk: string): BossMonthChar[] {
  const chars = s.bossMonths[mk];
  return chars && chars.length ? chars : [{ id: "main", name: "주 캐릭터", diff: null, party: 1 }];
}

export function monthBossSum(s: DiaryState, mk: string): number {
  let sum = 0;
  for (const ch of monthChars(s, mk)) {
    if (ch.diff && BOSS_MONTHLY[0].diffs[ch.diff] != null)
      sum += Math.floor(BOSS_MONTHLY[0].diffs[ch.diff] / (ch.party || 1));
  }
  return sum;
}

export function bossMonthTotal(s: DiaryState, y: number, m: number) {
  let weekly = 0,
    count = 0;
  for (const wk of monthThursdays(y, m)) {
    const t = weekTotal(s, wk);
    weekly += t.sum;
    count += t.count;
  }
  const monthly = monthBossSum(s, monthKey(y, m));
  return { weekly, count, monthly, total: weekly + monthly };
}

export function bossAllTotal(s: DiaryState): number {
  let sum = 0;
  for (const wk of Object.keys(s.bossWeeks)) sum += weekTotal(s, wk).sum;
  for (const mk of Object.keys(s.bossMonths)) sum += monthBossSum(s, mk);
  return sum;
}

/* ---------- 월간/전체 손익 ---------- */
export function monthNet(s: DiaryState) {
  const now = new Date();
  const rev =
    s.hunts.filter((h) => inThisMonth(h.date)).reduce((sum, h) => sum + huntNet(h, s.solPrice), 0) +
    bossMonthTotal(s, now.getFullYear(), now.getMonth()).total;
  const led = s.expenses.filter((e) => inThisMonth(e.date));
  const inc = led.filter((e) => e.kind === "in").reduce((sum, e) => sum + e.amount, 0);
  const exp = led.filter((e) => e.kind !== "in").reduce((sum, e) => sum + e.amount, 0);
  return { rev: rev + inc, exp, net: rev + inc - exp };
}

/* 전체 누적 게임 메소: 사냥 + 보스 + 가계부(수입−지출) */
export function totalGameMeso(s: DiaryState): number {
  const hunt = s.hunts.reduce((sum, h) => sum + huntNet(h, s.solPrice), 0);
  const inc = s.expenses.filter((e) => e.kind === "in").reduce((sum, e) => sum + e.amount, 0);
  const out = s.expenses.filter((e) => e.kind !== "in").reduce((sum, e) => sum + e.amount, 0);
  return hunt + bossAllTotal(s) + inc - out;
}

/* ---------- 장비 가치 ---------- */
/* 구매 비용(원): 구매가 × (관세?1.1:1) × 구매일 쌀 시세 */
export function equipBuyCost(e: Equip): number {
  return Math.round(((e.buyPrice || 0) / 1e8) * (e.tariff ? 1.1 : 1) * (e.buyRice || 0));
}
/* 쌀 가치(원): 재판매가 있으면 재판매가×재판매 쌀 시세, 없으면 구매가×구매 쌀 시세 */
export function equipCashValue(e: Equip): { won: number; based: "sell" | "buy" } {
  if (e.sellPrice != null) return { won: Math.round((e.sellPrice / 1e8) * (e.sellRice || 0)), based: "sell" };
  return { won: Math.round(((e.buyPrice || 0) / 1e8) * (e.buyRice || 0)), based: "buy" };
}

/* ---------- 쌀 복구 현황 ---------- */
export function recoveryStatus(s: DiaryState) {
  const cashIn = s.cash.filter((c) => c.kind === "in").reduce((sum, c) => sum + c.amount, 0);
  const cashOut = s.cash.filter((c) => c.kind !== "in").reduce((sum, c) => sum + c.amount, 0);
  const invested = cashOut - cashIn; /* 순투입(원) */
  const mesoWon = Math.round((totalGameMeso(s) / 1e8) * (s.cashPrice || 0));
  const itemWon = s.equips.reduce((sum, e) => sum + equipCashValue(e).won, 0);
  const recoverable = mesoWon + itemWon;
  return { invested, mesoWon, itemWon, recoverable, remain: Math.max(0, invested - recoverable) };
}

/* ---------- 레벨 ---------- */
export function levelDiff(log: Record<string, LevelEntry>, ds: string): number | null {
  const cur = log[ds];
  const d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const prev = log[dsOf(d.getFullYear(), d.getMonth(), d.getDate())];
  if (!cur || !prev) return null;
  return (cur.level - prev.level) * 100 + (cur.rate - prev.rate);
}

export { todayStr };
