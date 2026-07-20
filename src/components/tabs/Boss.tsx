"use client";

import { useRef, useState } from "react";
import Modal from "../Modal";
import { useAction, useStore } from "../store";
import {
  BOSS_MONTHLY,
  BOSS_WEEKLY,
  DIFF_LABEL,
  DIFF_ORDER,
  PRICE_BASIS,
  WEEKLY_SELL_LIMIT,
} from "@/lib/boss-data";
import { bossMonthTotal, charTotal, monthBossSum, monthChars, weekChars, weekTotal } from "@/lib/calc";
import { currentCycleThu, fmtMeso, monthKey, monthThursdays, shiftDs, uid, weekRangeLabel } from "@/lib/format";
import type { BossMonthChar, BossWeekChar } from "@/lib/types";
import { saveBossMonth, saveBossWeek } from "@/server/actions/records";

export default function Boss() {
  const { s, set, toast } = useStore();
  const run = useAction();
  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const [weekSel, setWeekSel] = useState<string>(currentCycleThu());
  const [charSel, setCharSel] = useState("main");
  const [modal, setModal] = useState<null | { mode: "add" | "rename"; def: string }>(null);
  const delRef = useRef(0);

  /* '주 캐릭터'(main 슬롯)는 설정의 Nexon 캐릭터 이름으로 표시 (표시 전용, 데이터 미변경) */
  const mainName = s.mapleName || s.profile.name || "주 캐릭터";
  const dispName = (c: { id: string; name: string }) =>
    c.id === "main" && (!c.name || c.name === "주 캐릭터") ? mainName : c.name;

  const weeks = monthThursdays(y, m);
  const isMonth = weekSel === "month";
  /* 선택 주차가 이 달에 없으면 보정 */
  if (!isMonth && !weeks.includes(weekSel)) {
    const cur = currentCycleThu();
    const fix = weeks.includes(cur) ? cur : weeks[0];
    if (fix && fix !== weekSel) setTimeout(() => setWeekSel(fix), 0);
  }

  const move = (d: number) => {
    let nm = m + d,
      ny = y;
    if (nm < 0) (nm = 11), ny--;
    if (nm > 11) (nm = 0), ny++;
    setM(nm);
    setY(ny);
    setWeekSel(monthThursdays(ny, nm).includes(currentCycleThu()) ? currentCycleThu() : monthThursdays(ny, nm)[0]);
  };

  const mt = bossMonthTotal(s, y, m);
  const mk = monthKey(y, m);

  /* 현재 선택된 컨테이너의 캐릭터 목록 */
  const chars: (BossWeekChar | BossMonthChar)[] = isMonth ? monthChars(s, mk) : weekChars(s, weekSel);
  if (!chars.find((c) => c.id === charSel)) {
    const fix = chars[0]?.id || "main";
    if (fix !== charSel) setTimeout(() => setCharSel(fix), 0);
  }

  /* 주간 슬롯 저장 헬퍼 */
  const persistWeek = async (next: BossWeekChar[]) => {
    set((p) => ({ ...p, bossWeeks: { ...p.bossWeeks, [weekSel]: next } }));
    await run(() => saveBossWeek(weekSel, next));
  };
  const persistMonth = async (next: BossMonthChar[]) => {
    set((p) => ({ ...p, bossMonths: { ...p.bossMonths, [mk]: next } }));
    await run(() => saveBossMonth(mk, next));
  };

  const ensureWeekChars = (): BossWeekChar[] => {
    const base = s.bossWeeks[weekSel];
    if (base && base.length) return JSON.parse(JSON.stringify(base));
    return [{ id: "main", name: "주 캐릭터", weekly: {} }];
  };
  const ensureMonthChars = (): BossMonthChar[] => {
    const base = s.bossMonths[mk];
    if (base && base.length) return JSON.parse(JSON.stringify(base));
    return [{ id: "main", name: "주 캐릭터", diff: null, party: 1 }];
  };

  const toggleDiff = (bossId: string, diff: string) => {
    if (isMonth) {
      const next = ensureMonthChars();
      const ch = next.find((c) => c.id === charSel) || next[0];
      ch.diff = ch.diff === diff ? null : diff;
      persistMonth(next);
    } else {
      const next = ensureWeekChars();
      let ch = next.find((c) => c.id === charSel);
      if (!ch) {
        ch = { id: charSel || "main", name: "주 캐릭터", weekly: {} };
        next.push(ch);
      }
      const cur = ch.weekly[bossId] || { diff: null, party: 1 };
      const def = BOSS_WEEKLY.find((b) => b.id === bossId);
      if (cur.diff === diff) cur.diff = null;
      else {
        const count = BOSS_WEEKLY.filter((b) => !b.noCount && ch!.weekly[b.id]?.diff).length;
        if (!cur.diff && !def?.noCount && count >= WEEKLY_SELL_LIMIT) {
          toast(`캐릭터당 주간 결정석은 최대 ${WEEKLY_SELL_LIMIT}개까지 판매할 수 있어요`);
          return;
        }
        cur.diff = diff;
      }
      ch.weekly[bossId] = cur;
      persistWeek(next);
    }
  };

  const setParty = (bossId: string, v: number) => {
    const party = Math.min(6, Math.max(1, v || 1));
    if (isMonth) {
      const next = ensureMonthChars();
      const ch = next.find((c) => c.id === charSel) || next[0];
      ch.party = party;
      persistMonth(next);
    } else {
      const next = ensureWeekChars();
      const ch = next.find((c) => c.id === charSel) || next[0];
      const cur = ch.weekly[bossId] || { diff: null, party: 1 };
      cur.party = party;
      ch.weekly[bossId] = cur;
      persistWeek(next);
    }
  };

  const addOrRename = (name: string) => {
    if (isMonth) {
      const next = ensureMonthChars();
      if (modal?.mode === "rename") {
        const ch = next.find((c) => c.id === charSel);
        if (ch) ch.name = name;
      } else {
        const ch: BossMonthChar = { id: uid(), name, diff: null, party: 1 };
        next.push(ch);
        setCharSel(ch.id);
      }
      persistMonth(next);
    } else {
      const next = ensureWeekChars();
      if (modal?.mode === "rename") {
        const ch = next.find((c) => c.id === charSel);
        if (ch) ch.name = name;
      } else {
        const ch: BossWeekChar = { id: uid(), name, weekly: {} };
        next.push(ch);
        setCharSel(ch.id);
      }
      persistWeek(next);
    }
    toast(modal?.mode === "rename" ? "이름을 변경했어요" : "캐릭터 슬롯을 추가했어요");
  };

  const deleteChar = () => {
    const nowMs = Date.now();
    if (nowMs - delRef.current > 4000) {
      delRef.current = nowMs;
      toast("삭제하려면 4초 안에 한 번 더 누르세요");
      return;
    }
    delRef.current = 0;
    if (isMonth) {
      const next = ensureMonthChars().filter((c) => c.id !== charSel);
      setCharSel(next[0]?.id || "main");
      persistMonth(next);
    } else {
      const next = ensureWeekChars().filter((c) => c.id !== charSel);
      setCharSel(next[0]?.id || "main");
      persistWeek(next);
    }
    toast("슬롯을 삭제했어요");
  };

  const copyPrev = () => {
    if (isMonth) return;
    const prev = s.bossWeeks[shiftDs(weekSel, -7)];
    const has = prev && prev.some((c) => Object.values(c.weekly).some((x) => x.diff));
    if (!has) return toast("이전 주차 기록이 없어요");
    const next = JSON.parse(JSON.stringify(prev)) as BossWeekChar[];
    setCharSel(next[0].id);
    persistWeek(next);
    toast("이전 주차 선택(캐릭터 포함)을 불러왔어요");
  };

  const curChar = chars.find((c) => c.id === charSel) || chars[0];

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">보스</div>
          <div className="page-sub">주간 사이클: 목요일 00:00 ~ 수요일 23:59 · 목요일이 속한 달의 주차로 기록됩니다</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="cal-nav">
          <button className="btn-nav" onClick={() => move(-1)} aria-label="이전 달">
            ◀
          </button>
          <div className="cal-title">
            {y}년 {m + 1}월
          </div>
          <button className="btn-nav" onClick={() => move(1)} aria-label="다음 달">
            ▶
          </button>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          <div className="panel-inner span-4">
            <div className="card-sub">주간보스 수익 합계</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{fmtMeso(mt.weekly)}</div>
          </div>
          <div className="panel-inner span-4">
            <div className="card-sub">결정 판매 갯수</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{mt.count}개</div>
          </div>
          <div className="panel-inner span-4">
            <div className="card-sub">월간보스 수익 (검은 마법사)</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{fmtMeso(mt.monthly)}</div>
          </div>
        </div>
        <div className="panel-inner" style={{ marginTop: 10, borderColor: "#f0c48a", background: "#fdeeda" }}>
          <div className="card-sub">
            {m + 1}월 수익 합계 (주간 {weeks.length}주 + 월간)
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "var(--accent-deep)" }}>{fmtMeso(mt.total)}</div>
        </div>
      </div>

      <div className="wk-tabs">
        {weeks.map((wk, i) => {
          const t = weekTotal(s, wk);
          return (
            <button key={wk} className={"wk-tab" + (weekSel === wk ? " on" : "")} onClick={() => setWeekSel(wk)}>
              <div className="w1">
                {i + 1}주차{wk === currentCycleThu() ? " · 이번 주" : ""}
              </div>
              <div className="w2">{weekRangeLabel(wk)}</div>
              <div className="w3">{t.count ? fmtMeso(t.sum) : "미기록"}</div>
            </button>
          );
        })}
        <button className={"wk-tab" + (isMonth ? " on" : "")} onClick={() => setWeekSel("month")}>
          <div className="w1">월간 보스</div>
          <div className="w2">
            {m + 1}.1 ~ {m + 1}.{new Date(y, m + 1, 0).getDate()} · 검은 마법사
          </div>
          <div className="w3">{monthBossSum(s, mk) ? fmtMeso(monthBossSum(s, mk)) : "미기록"}</div>
        </button>
      </div>

      {/* 캐릭터별 수익 내역 (선택한 주차/월간) */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <div className="card-title">캐릭터별 수익</div>
            <div className="card-sub">
              {isMonth
                ? `${m + 1}월 월간보스 · 캐릭터별`
                : `${m + 1}월 ${weeks.indexOf(weekSel) + 1}주차 · ${weekRangeLabel(weekSel)}`}
            </div>
          </div>
          <div className="card-aside">{fmtMeso(isMonth ? monthBossSum(s, mk) : weekTotal(s, weekSel).sum)}</div>
        </div>
        {chars.map((c) => {
          if (isMonth) {
            const cc = c as BossMonthChar;
            const v =
              cc.diff && BOSS_MONTHLY[0].diffs[cc.diff] != null
                ? Math.floor(BOSS_MONTHLY[0].diffs[cc.diff] / (cc.party || 1))
                : 0;
            return (
              <div
                key={c.id}
                className="stat-line"
                style={{ cursor: "pointer" }}
                onClick={() => setCharSel(c.id)}
              >
                <span style={{ fontWeight: c.id === charSel ? 800 : undefined }}>{dispName(c)}</span>
                <b style={{ color: v ? "var(--accent-deep)" : "var(--ink-soft)" }}>{v ? fmtMeso(v) : "미기록"}</b>
              </div>
            );
          }
          const t = charTotal(c as BossWeekChar);
          return (
            <div
              key={c.id}
              className="stat-line"
              style={{ cursor: "pointer" }}
              onClick={() => setCharSel(c.id)}
            >
              <span style={{ fontWeight: c.id === charSel ? 800 : undefined }}>
                {dispName(c)} <span className="sub">결정 {t.count}/{WEEKLY_SELL_LIMIT}</span>
              </span>
              <b style={{ color: t.sum ? "var(--accent-deep)" : "var(--ink-soft)" }}>{t.sum ? fmtMeso(t.sum) : "미기록"}</b>
            </div>
          );
        })}
      </div>

      <div className="panel tbl-wrap">
        <div className="card-head">
          <div>
            <div className="card-title">
              {isMonth
                ? `${m + 1}월 월간 보스 · ${curChar ? dispName(curChar) : ""}`
                : `${m + 1}월 ${weeks.indexOf(weekSel) + 1}주차 · ${curChar ? dispName(curChar) : ""} 결정 ${
                    curChar && "weekly" in curChar ? charTotal(curChar).count : 0
                  }/${WEEKLY_SELL_LIMIT}`}
            </div>
            <div className="card-sub">
              {isMonth ? `${y}.${m + 1}.1 00:00 ~ 말일 23:59` : weekRangeLabel(weekSel)} · 캐릭터 {chars.length}명 · 가격 기준{" "}
              {PRICE_BASIS}
            </div>
          </div>
          <div id="bs-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => setModal({ mode: "rename", def: curChar ? dispName(curChar) : "" })}>
              이름 변경
            </button>
            <button className="btn ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={deleteChar}>
              슬롯 삭제
            </button>
            {!isMonth && (
              <button className="btn ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={copyPrev}>
                이전 주차 불러오기
              </button>
            )}
          </div>
        </div>

        <div className="chips" style={{ margin: "6px 0 12px" }}>
          {chars.map((c) => {
            const label = isMonth
              ? (() => {
                  const cc = c as BossMonthChar;
                  const v = cc.diff && BOSS_MONTHLY[0].diffs[cc.diff] != null ? Math.floor(BOSS_MONTHLY[0].diffs[cc.diff] / (cc.party || 1)) : 0;
                  return v ? fmtMeso(v) : "미기록";
                })()
              : (() => {
                  const t = charTotal(c as BossWeekChar);
                  return `${t.sum ? fmtMeso(t.sum) : "미기록"} · ${t.count}/${WEEKLY_SELL_LIMIT}`;
                })();
            return (
              <button key={c.id} className={"chip" + (c.id === charSel ? " on" : "")} onClick={() => setCharSel(c.id)}>
                {dispName(c)} <span style={{ opacity: 0.75, fontWeight: 600 }}>{label}</span>
              </button>
            );
          })}
          <button className="chip" onClick={() => setModal({ mode: "add", def: `캐릭터 ${Math.max(chars.length, 1) + 1}` })}>
            ＋ 캐릭터 추가
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 110 }}>보스</th>
              <th>난이도</th>
              <th className="num" style={{ width: 70 }}>
                파티원
              </th>
              <th className="num" style={{ width: 130 }}>
                가격
              </th>
            </tr>
          </thead>
          <tbody>
            {(isMonth ? BOSS_MONTHLY : BOSS_WEEKLY).map((b) => {
              let diff: string | null = null;
              let party = 1;
              if (isMonth) {
                const cc = curChar as BossMonthChar | undefined;
                diff = cc?.diff ?? null;
                party = cc?.party ?? 1;
              } else {
                const cc = curChar as BossWeekChar | undefined;
                const selw = cc?.weekly[b.id];
                diff = selw?.diff ?? null;
                party = selw?.party ?? 1;
              }
              const price = diff && b.diffs[diff] != null ? (b.noCount ? b.diffs[diff] : Math.floor(b.diffs[diff] / party)) : 0;
              return (
                <tr key={b.id}>
                  <td className="strong" style={{ whiteSpace: "nowrap" }}>
                    {b.name}
                    {b.event && (
                      <span className="tag" style={{ fontSize: 10, padding: "1px 7px" }}>
                        이벤트
                      </span>
                    )}
                  </td>
                  <td>
                    {DIFF_ORDER.filter((d) => b.diffs[d] != null).map((d) => (
                      <button key={d} className={`diff d-${d}${diff === d ? " on" : ""}`} onClick={() => toggleDiff(b.id, d)}>
                        {diff === d ? "✓ " : ""}
                        {DIFF_LABEL[d]}
                      </button>
                    ))}
                  </td>
                  <td className="num">
                    {b.noCount ? (
                      <span className="sub">—</span>
                    ) : (
                      <select className="party-sel" value={party} onChange={(e) => setParty(b.id, parseInt(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6].map((nn) => (
                          <option key={nn} value={nn}>
                            {nn}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className={"num" + (price ? " strong" : "")} style={{ whiteSpace: "nowrap" }}>
                    {price ? fmtMeso(price) : "0"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <CharModal
          title={modal.mode === "rename" ? "캐릭터 이름 변경" : "캐릭터 슬롯 추가"}
          def={modal.def}
          onClose={() => setModal(null)}
          onSave={(name) => {
            addOrRename(name);
            setModal(null);
          }}
        />
      )}
    </section>
  );
}

function CharModal({ title, def, onClose, onSave }: { title: string; def: string; onClose: () => void; onSave: (name: string) => void }) {
  const { toast } = useStore();
  const [name, setName] = useState(def);
  const submit = () => {
    if (!name.trim()) return toast("이름을 입력하세요");
    onSave(name.trim());
  };
  return (
    <Modal title={title} onClose={onClose} onSubmit={submit}>
      <div className="field">
        <label>캐릭터 이름</label>
        <input type="text" value={name} placeholder="캐릭터 이름" autoFocus onChange={(e) => setName(e.target.value)} />
      </div>
    </Modal>
  );
}
