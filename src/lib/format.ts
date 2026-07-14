/* 메소 → '1.3억' 표기 (레거시 fmtMeso와 동일 규칙) */
export function fmtMeso(n: number): string {
  n = Math.round(n);
  if (n === 0) return "0";
  const neg = n < 0;
  const eok = Math.abs(n) / 1e8;
  const s =
    eok >= 0.095
      ? (Math.round(eok * 10) / 10).toFixed(1).replace(/\.0$/, "")
      : (Math.round(eok * 100) / 100).toFixed(2);
  return (neg ? "-" : "") + s + "억";
}

export function fmtWon(n: number): string {
  return (n < 0 ? "-" : "") + Math.abs(Math.round(n)).toLocaleString("ko-KR") + "원";
}

export function fmtWonShort(n: number): string {
  const neg = n < 0;
  const a = Math.abs(Math.round(n));
  if (a >= 1e4) return (neg ? "-" : "") + (Math.round(a / 1e3) / 10).toFixed(1).replace(/\.0$/, "") + "만원";
  return (neg ? "-" : "") + a.toLocaleString("ko-KR") + "원";
}

/* ---------- 날짜 유틸 (로컬 타임존 기준 YYYY-MM-DD) ---------- */
export const dsOf = (y: number, m: number, d: number) =>
  y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");

export const todayStr = () => {
  const d = new Date();
  return dsOf(d.getFullYear(), d.getMonth(), d.getDate());
};

export const monthKey = (y: number, m: number) => y + "-" + String(m + 1).padStart(2, "0");

export function shiftDs(ds: string, days: number): string {
  const d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() + days);
  return dsOf(d.getFullYear(), d.getMonth(), d.getDate());
}

/* 해당 달에 속한 목요일(=보스 주차 시작일) 목록 */
export function monthThursdays(y: number, m: number): string[] {
  const out: string[] = [];
  const dim = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) if (new Date(y, m, d).getDay() === 4) out.push(dsOf(y, m, d));
  return out;
}

/* 오늘이 속한 보스 사이클의 목요일 (사이클: 목 00:00 ~ 수 23:59) */
export function currentCycleThu(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - 4 + 7) % 7));
  return dsOf(d.getFullYear(), d.getMonth(), d.getDate());
}

export function weekRangeLabel(thuDs: string): string {
  const wed = shiftDs(thuDs, 6);
  const f = (ds: string) => {
    const [, m, d] = ds.split("-");
    return `${+m}.${+d}`;
  };
  return `${f(thuDs)}(목) ~ ${f(wed)}(수)`;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
