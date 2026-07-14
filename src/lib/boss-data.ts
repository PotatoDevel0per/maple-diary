/* 결정석 가격 출처: matsu1207.tistory.com/757 (2026-06-18 기준) */
export interface BossDef {
  id: string;
  name: string;
  diffs: Record<string, number>;
  noCount?: boolean; /* 판매 수량 제한(12개)에 포함되지 않음 */
  event?: boolean;
}

export const BOSS_WEEKLY: BossDef[] = [
  { id: "mayrin", name: "메이린", diffs: { hard: 600000000, normal: 300000000 }, noCount: true, event: true },
  { id: "jupiter", name: "유피테르", diffs: { hard: 4845000000, normal: 1615000000 } },
  { id: "baldrix", name: "발드릭스", diffs: { hard: 3078000000, normal: 1368000000 } },
  { id: "limbo", name: "림보", diffs: { hard: 2385000000, normal: 1026000000 } },
  { id: "hyungsung", name: "흉성", diffs: { hard: 2678000000, normal: 625000000 } },
  { id: "kaling", name: "카링", diffs: { extreme: 5387000000, hard: 1739000000, normal: 678000000, easy: 377000000 } },
  { id: "adversary", name: "대적자", diffs: { extreme: 4712000000, hard: 1435000000, normal: 560000000, easy: 308000000 } },
  { id: "kalos", name: "칼로스", diffs: { extreme: 4104000000, chaos: 1273000000, normal: 505000000, easy: 280000000 } },
  { id: "seren", name: "세렌", diffs: { extreme: 2835000000, hard: 356000000, normal: 239000000 } },
  { id: "jinhilla", name: "진 힐라", diffs: { hard: 106000000, normal: 71200000 } },
  { id: "dunkel", name: "듄켈", diffs: { hard: 94400000, normal: 47500000 } },
  { id: "dusk", name: "더스크", diffs: { chaos: 69800000, normal: 44000000 } },
  { id: "gaenseul", name: "가엔슬", diffs: { chaos: 75100000, normal: 25500000 } },
  { id: "will", name: "윌", diffs: { hard: 77100000, normal: 41100000, easy: 32300000 } },
  { id: "lucid", name: "루시드", diffs: { hard: 62900000, normal: 35600000, easy: 29800000 } },
  { id: "damien", name: "데미안", diffs: { hard: 48900000, normal: 17500000 } },
  { id: "suu", name: "스우", diffs: { extreme: 574000000, hard: 51500000, normal: 16700000 } },
  { id: "papulatus", name: "파풀라투스", diffs: { chaos: 13100000 } },
  { id: "vellum", name: "벨룸", diffs: { chaos: 9280000 } },
  { id: "queen", name: "블러디퀸", diffs: { chaos: 8140000 } },
  { id: "pierre", name: "피에르", diffs: { chaos: 8170000 } },
  { id: "vonbon", name: "반반", diffs: { chaos: 8150000 } },
  { id: "magnus", name: "매그너스", diffs: { hard: 8560000 } },
  { id: "zakum", name: "자쿰", diffs: { chaos: 8080000 } },
];

export const BOSS_MONTHLY: BossDef[] = [
  { id: "blackmage", name: "검은 마법사", diffs: { extreme: 8740000000, hard: 665000000 } },
];

export const DIFF_LABEL: Record<string, string> = {
  extreme: "EXTREME",
  chaos: "CHAOS",
  hard: "HARD",
  normal: "NORMAL",
  easy: "EASY",
};
export const DIFF_ORDER = ["extreme", "chaos", "hard", "normal", "easy"];

export const PRICE_BASIS = "2026-06-18";
export const WEEKLY_SELL_LIMIT = 12;

export const EQUIP_PARTS = ["장신구", "방어구", "무기", "보조무기", "엠블렘"];

export const LED_CATS: Record<"in" | "out", string[]> = {
  out: ["구매", "강화", "소모", "기타"],
  in: ["판매", "보상", "기타"],
};
export const CASH_CATS: Record<"in" | "out", string[]> = {
  out: ["캐시 충전", "쌀 구매", "기타"],
  in: ["쌀 판매", "기타"],
};
