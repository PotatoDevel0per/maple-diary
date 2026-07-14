"use client";

import { useState } from "react";
import Calendar from "../Calendar";
import { useAction, useStore } from "../store";
import { levelDiff } from "@/lib/calc";
import { dsOf, shiftDs, todayStr } from "@/lib/format";
import type { LevelEntry } from "@/lib/types";
import { fetchLevelNow, fetchLevels } from "@/server/actions/level";

export default function Level() {
  const { s, set, toast } = useStore();
  const run = useAction();
  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const [sel, setSel] = useState(todayStr());
  const [busy, setBusy] = useState("");

  const log = s.levelLog;
  const move = (d: number) => {
    let nm = m + d,
      ny = y;
    if (nm < 0) (nm = 11), ny--;
    if (nm > 11) (nm = 0), ny++;
    setM(nm);
    setY(ny);
  };

  const onFetch30 = async () => {
    if (busy) return toast("이미 불러오는 중이에요");
    setBusy("불러오는 중...");
    const r = await run(() => fetchLevels(30));
    setBusy("");
    if (!r) return;
    set((p) => ({ ...p, levelLog: r.log }));
    toast(`${r.got}일 불러옴` + (r.fail ? ` · 실패 ${r.fail}건` : ""));
  };
  const onFetchNow = async () => {
    if (busy) return;
    setBusy("기록 중...");
    const r = await run(() => fetchLevelNow());
    setBusy("");
    if (!r) return;
    set((p) => ({ ...p, levelLog: { ...p.levelLog, [r.date]: r.entry } }));
    toast("현재 시점을 기록했어요");
  };

  const rec = log[sel];
  const [sm, sd] = [+sel.split("-")[1], +sel.split("-")[2]];
  const mm = String(m + 1).padStart(2, "0");
  const dim = new Date(y, m + 1, 0).getDate();

  const sumRange = (days: number): number | null => {
    let sum = 0,
      has = false;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const v = levelDiff(log, dsOf(d.getFullYear(), d.getMonth(), d.getDate()));
      if (v != null) {
        sum += v;
        has = true;
      }
    }
    return has ? sum : null;
  };
  let mSum = 0,
    mHas = false;
  for (let d = 1; d <= dim; d++) {
    const v = levelDiff(log, `${y}-${mm}-${String(d).padStart(2, "0")}`);
    if (v != null) {
      mSum += v;
      mHas = true;
    }
  }

  const line = (label: string, v: number | null) => (
    <div className="stat-line">
      <span>{label}</span>
      {v == null ? (
        <b style={{ color: "var(--ink-soft)" }}>-</b>
      ) : (
        <b style={{ color: v >= 0 ? "var(--accent-deep)" : "var(--danger)" }}>
          {v > 0 ? "+" : ""}
          {v.toFixed(3)}%
        </b>
      )}
    </div>
  );

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">레벨</div>
          <div className="page-sub">일별 경험치 기록 · 전일 대비 상승률을 추적합니다 (Nexon Open API)</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="card-sub">{busy}</span>
          <button className="btn ghost" onClick={onFetch30}>
            최근 30일 불러오기
          </button>
          <button className="btn" onClick={onFetchNow}>
            현재 시점 기록
          </button>
        </div>
      </div>
      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="panel span-8">
          <Calendar
            y={y}
            m={m}
            selected={sel}
            onSelect={setSel}
            onMove={move}
            cell={(ds) => {
              const r = log[ds];
              if (!r) return {};
              const v = levelDiff(log, ds);
              return {
                has: true,
                net: v ?? 0,
                netStr: `Lv.${r.level}`,
                sub: v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : `${r.rate.toFixed(1)}%`,
              };
            }}
          />
        </div>
        <div className="span-4">
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div className="card-title">
                {sm}월 {sd}일
              </div>
            </div>
            {!rec ? (
              <div className="empty" style={{ padding: "18px 12px" }}>
                이 날의 기록이 없어요.
                <br />
                레벨 기록을 불러오면 채워집니다.
              </div>
            ) : (
              <DayDetail log={log} ds={sel} rec={rec} />
            )}
          </div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>
              누적 상승
            </div>
            {line("최근 7일", sumRange(7))}
            {line("최근 14일", sumRange(14))}
            {line(`${m + 1}월 합계`, mHas ? mSum : null)}
          </div>
          <div className="panel">
            <div className="card-title" style={{ marginBottom: 4 }}>
              연동 안내
            </div>
            <div className="note" style={{ marginTop: 6 }}>
              설정 탭에서 Nexon Open API 키와 캐릭터 닉네임을 저장하면 사용할 수 있어요. 과거 날짜 데이터는 다음 날 새벽부터 조회됩니다.
            </div>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="card-head">
          <div>
            <div className="card-title">{m + 1}월 일별 성장 그래프</div>
            <div className="card-sub">막대는 전일 대비 상승률, ★는 레벨업한 날</div>
          </div>
          <div className="card-aside">{mHas ? `누적 ${mSum > 0 ? "+" : ""}${mSum.toFixed(2)}%` : ""}</div>
        </div>
        <LevelChart log={log} y={y} m={m} />
      </div>
    </section>
  );
}

function DayDetail({ log, ds, rec }: { log: Record<string, LevelEntry>; ds: string; rec: LevelEntry }) {
  const v = levelDiff(log, ds);
  const prev = log[shiftDs(ds, -1)];
  let base: number | null = null;
  if (prev) {
    if (prev.level === rec.level) base = prev.rate;
    else if (prev.level < rec.level) base = 0;
  }
  return (
    <>
      <div style={{ fontSize: 24, fontWeight: 800 }}>
        Lv. {rec.level} <span style={{ color: "var(--accent-deep)", fontSize: 19 }}>{rec.rate.toFixed(3)}%</span>
        {rec.live && (
          <span className="tag" style={{ fontSize: 10, padding: "1px 7px", verticalAlign: "middle" }}>
            실시간
          </span>
        )}
      </div>
      <div className="progress-track" style={{ height: 10 }}>
        <div className="progress-fill" style={{ width: Math.min(100, rec.rate) + "%" }} />
      </div>
      <div className="progress-note">다음 레벨까지 {(100 - rec.rate).toFixed(3)}%</div>
      <div style={{ marginTop: 10, fontSize: 14 }}>
        {v == null ? (
          <span style={{ color: "var(--ink-soft)" }}>전일 기록 없음</span>
        ) : (
          <b style={{ color: v > 0 ? "var(--accent-deep)" : v < 0 ? "var(--danger)" : "var(--ink-soft)" }}>
            전일 대비 {v > 0 ? "+" : ""}
            {v.toFixed(3)}%
          </b>
        )}
        {base != null && (
          <span className="card-sub"> · 오늘 획득 +{Math.max(0, rec.rate - base).toFixed(3)}%p</span>
        )}
      </div>
    </>
  );
}

function LevelChart({ log, y, m }: { log: Record<string, LevelEntry>; y: number; m: number }) {
  const dim = new Date(y, m + 1, 0).getDate();
  const mm = String(m + 1).padStart(2, "0");
  const data: { d: number; v: number | null; lvup: boolean }[] = [];
  let any = false;
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${mm}-${String(d).padStart(2, "0")}`;
    const v = levelDiff(log, ds);
    const cur = log[ds];
    const prev = log[shiftDs(ds, -1)];
    data.push({ d, v, lvup: !!(cur && prev && cur.level > prev.level) });
    if (v != null) any = true;
  }
  if (!any)
    return <div className="empty">이 달의 성장 기록이 없어요. 레벨 기록을 불러오면 그래프가 표시됩니다.</div>;

  const W = 940,
    H = 250,
    padL = 52,
    padR = 12,
    padT = 20,
    padB = 28;
  const vals = data.filter((x) => x.v != null).map((x) => x.v as number);
  const max = Math.max(...vals, 0),
    min = Math.min(...vals, 0);
  const range = max - min || 1;
  const yOf = (v: number) => padT + (H - padT - padB) * ((max - v) / range);
  const y0 = yOf(0);
  const bw = (W - padL - padR) / dim;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const yLab = (v: number, yy: number) => (
    <text x={padL - 8} y={yy + 3.5} fontSize="10" fill="#9a7b52" textAnchor="end">
      {v > 0 ? "+" : ""}
      {v.toFixed(1)}%
    </text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="일별 경험치 성장 그래프">
      <line x1={padL} y1={y0} x2={W - padR} y2={y0} stroke="#ead9bf" />
      {max > 0 && yLab(max, yOf(max))}
      {min < 0 && yLab(min, yOf(min))}
      {yLab(0, y0)}
      <line x1={padL} y1={yOf(avg)} x2={W - padR} y2={yOf(avg)} stroke="#d97f1e" strokeDasharray="5 5" opacity="0.55" />
      <text x={W - padR} y={yOf(avg) - 5} fontSize="10" fill="#d97f1e" textAnchor="end">
        평균 {avg > 0 ? "+" : ""}
        {avg.toFixed(2)}%
      </text>
      {data.map(({ d, v, lvup }) => {
        const cx = padL + (d - 1) * bw + bw / 2;
        const els = [];
        if (v != null) {
          const yTop = Math.min(y0, yOf(v)),
            h = Math.max(2, Math.abs(y0 - yOf(v)));
          els.push(
            <rect key={"r" + d} x={cx - bw * 0.32} y={yTop} width={bw * 0.64} height={h} rx="3" fill={v >= 0 ? "#e8973a" : "#c0563a"} opacity={v >= 0 ? 0.9 : 0.85} />
          );
          if (lvup)
            els.push(
              <text key={"m" + d} x={cx} y={yOf(Math.max(v, 0)) - 7} fontSize="12" textAnchor="middle" fill="#d97f1e">
                ★
              </text>
            );
        }
        if (d === 1 || d % 2 === 1)
          els.push(
            <text key={"l" + d} x={cx} y={H - 9} fontSize="10" fill="#9a7b52" textAnchor="middle">
              {d}
            </text>
          );
        return els;
      })}
    </svg>
  );
}
