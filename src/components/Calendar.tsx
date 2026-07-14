"use client";

import { dsOf, todayStr } from "@/lib/format";

export interface CalCell {
  net?: number;   /* 표시할 순액 (없으면 미표시) */
  netStr?: string;
  sub?: string;
  has?: boolean;
}

export default function Calendar({
  y,
  m,
  selected,
  onSelect,
  onMove,
  cell,
}: {
  y: number;
  m: number;
  selected: string;
  onSelect: (ds: string) => void;
  onMove: (delta: number) => void;
  cell: (ds: string) => CalCell;
}) {
  const firstDow = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const today = todayStr();
  const blanks = Array.from({ length: firstDow });
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  return (
    <>
      <div className="cal-nav">
        <button className="btn-nav" onClick={() => onMove(-1)} aria-label="이전 달">
          ◀
        </button>
        <div className="cal-title">
          {y}년 {m + 1}월
        </div>
        <button className="btn-nav" onClick={() => onMove(1)} aria-label="다음 달">
          ▶
        </button>
      </div>
      <div className="cal-grid">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <div key={d} className={"cal-dow" + (i === 0 ? " sun" : "")}>
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {blanks.map((_, i) => (
          <div key={"b" + i} className="cal-cell blank" />
        ))}
        {days.map((d) => {
          const ds = dsOf(y, m, d);
          const c = cell(ds);
          const cls =
            "cal-cell" +
            (c.has ? " has" : "") +
            (ds === today ? " today" : "") +
            (ds === selected ? " sel" : "");
          return (
            <div key={ds} className={cls} onClick={() => onSelect(ds)}>
              <span className="d">{d}</span>
              {c.netStr && (
                <>
                  <div className={"cnet" + (c.net != null && c.net < 0 ? " neg" : "")}>{c.netStr}</div>
                  {c.sub && <div className="csoj">{c.sub}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
