export type Kind = "in" | "out";

export interface Hunt {
  id: string;
  date: string; /* YYYY-MM-DD */
  sojaebi: number; /* 1개 = 30분 */
  meso: number; /* raw 메소 */
  sol: number; /* 솔 에르다 조각 개수 */
  memo: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  kind: Kind;
  cat: string;
  title: string;
  amount: number; /* raw 메소 */
}

export interface CashEntry {
  id: string;
  date: string;
  kind: Kind;
  cat: string;
  title: string;
  amount: number; /* 원 */
}

export interface Equip {
  id: string;
  name: string;
  part: string;
  memo: string;
  buyDate: string;
  buyPrice: number; /* raw 메소 */
  buyMkt: number;
  buyRice: number;
  tariff: boolean;
  sellDate: string;
  sellPrice: number | null;
  sellMkt: number | null;
  sellRice: number | null;
}

export interface BossWeekSel {
  diff: string | null;
  party: number;
}
export interface BossWeekChar {
  id: string;
  name: string;
  weekly: Record<string, BossWeekSel>;
}
export interface BossMonthChar {
  id: string;
  name: string;
  diff: string | null;
  party: number;
}

export interface LevelEntry {
  level: number;
  rate: number;
  live?: boolean;
}

export interface DiaryState {
  profile: { name: string; greet: string };
  goal: number;
  solPrice: number;
  mktPrice: number;
  cashPrice: number;
  hasNexonKey: boolean;
  mapleName: string;
  charImage: string;
  hunts: Hunt[];
  expenses: LedgerEntry[];
  cash: CashEntry[];
  equips: Equip[];
  bossWeeks: Record<string, BossWeekChar[]>;   /* 목요일 키 → 캐릭터 슬롯 */
  bossMonths: Record<string, BossMonthChar[]>; /* YYYY-MM → 캐릭터 슬롯 */
  levelLog: Record<string, LevelEntry>;        /* YYYY-MM-DD → 기록 */
}
