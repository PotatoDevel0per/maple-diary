"use client";

import { useState } from "react";
import Calendar from "../Calendar";
import { useAction, useStore } from "../store";
import {
  bossMonthTotal,
  dailyNet,
  huntNet,
  inThisMonth,
  isAdjust,
  last7,
  levelDiff,
  monthBossSum,
  monthNet,
  recoveryStatus,
  totalGameMeso,
  weekTotal,
} from "@/lib/calc";
import { dsOf, fmtMeso, fmtWon, monthKey, todayStr } from "@/lib/format";
import { saveGoal } from "@/server/actions/settings";
import { addAssetAdjustment } from "@/server/actions/records";

export default function Dashboard({ onGo }: { onGo: (v: "records" | "cash" | "level") => void }) {
  const { s, set, toast } = useStore();
  const run = useAction();
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [editAsset, setEditAsset] = useState(false);
  const [assetMeso, setAssetMeso] = useState("");
  const [assetSol, setAssetSol] = useState("");
  const [assetInit, setAssetInit] = useState({ meso: "", sol: "" });
  const nowInit = new Date();
  const [calY, setCalY] = useState(nowInit.getFullYear());
  const [calM, setCalM] = useState(nowInit.getMonth());

  const calMove = (delta: number) => {
    let nm = calM + delta,
      ny = calY;
    if (nm < 0) (nm = 11), ny--;
    if (nm > 11) (nm = 0), ny++;
    setCalM(nm);
    setCalY(ny);
  };

  const now = new Date();
  const l7 = last7(s);
  const avg = l7.reduce((a, d) => a + d.net, 0) / 7;
  const m = monthNet(s);
  const rec = recoveryStatus(s);

  const saveGoalInline = async () => {
    const v = parseFloat(goalInput);
    const goal = isNaN(v) || v < 0 ? 0 : Math.round(v * 1e8);
    const r = await run(() => saveGoal(goal));
    if (r === undefined) return;
    set((p) => ({ ...p, goal: r }));
    setEditGoal(false);
    toast(r ? "목표를 저장했어요" : "목표를 해제했어요");
  };

  /* 현재 보유 자산 (누적 흐름 기반) */
  const assetTotal = totalGameMeso(s); /* 사냥(메소+조각) + 보스 + 가계부 순액 */
  const totalSol = s.hunts.reduce((a, h) => a + (h.sol || 0), 0);
  const solValue = totalSol * s.solPrice;
  const mesoOnly = assetTotal - solValue; /* 조각 환산분을 뺀 순수 메소 */

  const openAssetEdit = () => {
    const mesoStr = String(+(mesoOnly / 1e8).toFixed(2));
    const solStr = String(totalSol);
    setAssetMeso(mesoStr);
    setAssetSol(solStr);
    setAssetInit({ meso: mesoStr, sol: solStr });
    setEditAsset((v) => !v);
  };

  const saveAsset = async () => {
    /* 값을 안 바꾼 필드는 반올림 오차로 인한 허위 차익이 생기지 않도록 그대로 둠 */
    const targetMeso = assetMeso === assetInit.meso ? mesoOnly : Math.round((parseFloat(assetMeso) || 0) * 1e8);
    const targetSol = assetSol === assetInit.sol ? totalSol : Math.max(0, parseInt(assetSol) || 0);
    const dM = targetMeso - mesoOnly;
    const dF = targetSol - totalSol;
    if (dM === 0 && dF === 0) {
      setEditAsset(false);
      toast("변동이 없어요");
      return;
    }
    const row = await run(() => addAssetAdjustment({ date: todayStr(), mesoDiff: dM, solDiff: dF }));
    if (!row) return;
    set((p) => ({ ...p, hunts: [...p.hunts, row] }));
    setEditAsset(false);
    toast("보유 자산을 반영했어요 · 사냥 탭에 자산 보정 기록 추가");
  };

  /* 수익원 비중 (자산 보정 제외) */
  const srcHunt = s.hunts
    .filter((h) => inThisMonth(h.date) && !isAdjust(h))
    .reduce((a, h) => a + huntNet(h, s.solPrice), 0);
  const srcBoss = bossMonthTotal(s, now.getFullYear(), now.getMonth()).total;
  const srcInc = s.expenses.filter((e) => inThisMonth(e.date) && e.kind === "in").reduce((a, e) => a + e.amount, 0);
  const srcTotal = srcHunt + srcBoss + srcInc;
  const srcBar = (name: string, v: number) => {
    const pct = srcTotal > 0 ? Math.round((v / srcTotal) * 100) : 0;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span>
            {name} {pct}%
          </span>
          <b>{fmtMeso(v)}</b>
        </div>
        <div className="progress-track" style={{ height: 10, margin: 0 }}>
          <div className="progress-fill" style={{ width: pct + "%" }} />
        </div>
      </div>
    );
  };

  /* 사냥 효율 (자산 보정 제외) */
  const hm = s.hunts.filter((h) => inThisMonth(h.date) && !isAdjust(h));
  const effSoj = Math.round(hm.reduce((a, h) => a + h.sojaebi, 0));
  const effSol = hm.reduce((a, h) => a + (h.sol || 0), 0);
  const effMin = Math.round(effSoj * 30);

  /* 쌀 장부 요약 */
  const cashMonth = s.cash.filter((e) => inThisMonth(e.date));
  const cIn = cashMonth.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
  const cOut = cashMonth.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
  const tIn = s.cash.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
  const tOut = s.cash.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
  const tNet = tIn - tOut;

  /* 레벨 요약 */
  const lvDates = Object.keys(s.levelLog).sort();
  const lastLv = lvDates.length ? s.levelLog[lvDates[lvDates.length - 1]] : null;
  const l7lv: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const v = levelDiff(s.levelLog, dsOf(d.getFullYear(), d.getMonth(), d.getDate()));
    if (v != null) l7lv.push(v);
  }
  const sum7lv = l7lv.reduce((a, b) => a + b, 0);

  /* 목표 진행 */
  const goalPct = s.goal > 0 ? (m.net / s.goal) * 100 : 0;
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  const goalRemain = Math.max(0, s.goal - m.net);

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">{s.profile.name} 님, 어서오세요 🍁</div>
          <div className="page-sub">
            {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일 · {s.profile.greet}
          </div>
        </div>
        <button className="btn" onClick={() => onGo("records")}>
          + 사냥 추가
        </button>
      </div>

      {/* 쌀 복구 현황 */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <div className="card-title">🍚 쌀 복구 현황</div>
            <div className="card-sub">쌀 장부 순투입액을 게임 재화 + 아이템 쌀 가치로 얼마나 메꿨는지</div>
          </div>
          <div className="card-aside">{rec.invested > 0 ? Math.min(100, (rec.recoverable / rec.invested) * 100).toFixed(1) + "%" : ""}</div>
        </div>
        <div className="rec-bar-track">
          <div
            className="rec-bar-fill"
            style={{
              width: rec.invested > 0 ? Math.max(0, Math.min(100, (rec.recoverable / rec.invested) * 100)) + "%" : "0%",
              background: rec.invested > 0 && rec.recoverable >= rec.invested ? "var(--accent-deep)" : undefined,
            }}
          />
        </div>
        <div className="rec-hint" style={{ marginBottom: 0 }}>
          {rec.invested <= 0 ? (
            "쌀 장부에 지출을 기록하면 쌀 복구 현황이 표시됩니다."
          ) : rec.recoverable >= rec.invested ? (
            <>
              🎉 <b>{fmtWon(rec.recoverable)}</b> 회수 가능 · 투입 {fmtWon(rec.invested)}을 모두 메꿨어요 (+
              {fmtWon(rec.recoverable - rec.invested)})
            </>
          ) : (
            <>
              현재 <b>{fmtWon(rec.recoverable)}</b> 회수 가능 · 복구까지{" "}
              <b style={{ color: "#d0524a" }}>{fmtWon(rec.remain)}</b> 남았어요
            </>
          )}
        </div>
      </div>

      {/* 오늘 순수익 · 이번 달 요약+목표 · 보유 자산 */}
      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="panel kpi span-3">
          <div className="label">오늘 순수익</div>
          <div className="value">{fmtMeso(dailyNet(s, todayStr()))}</div>
          <div className="hint">최근 7일 평균 {fmtMeso(avg)}</div>
        </div>

        <div className="panel span-5">
          <div className="card-head">
            <div className="card-title">이번 달 요약</div>
            <a
              className="card-aside"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setGoalInput(s.goal ? String(+(s.goal / 1e8).toFixed(1)) : "");
                setEditGoal((v) => !v);
              }}
            >
              {editGoal ? "닫기" : "✏️ 목표"}
            </a>
          </div>
          <div style={{ marginBottom: 12 }}>
            {!editGoal ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span>목표 진행 {s.goal > 0 ? goalPct.toFixed(1) + "%" : "· 미설정"}</span>
                  {s.goal > 0 && (
                    <b>
                      {fmtMeso(m.net)} / {fmtMeso(s.goal)}
                    </b>
                  )}
                </div>
                <div className="progress-track" style={{ height: 10, margin: 0 }}>
                  <div className="progress-fill" style={{ width: Math.max(0, Math.min(100, goalPct)) + "%" }} />
                </div>
                <div className="progress-note" style={{ marginTop: 6 }}>
                  {s.goal > 0
                    ? goalRemain === 0
                      ? "🎉 이번 달 목표를 달성했어요!"
                      : `목표까지 ${fmtMeso(goalRemain)} · 하루 ${fmtMeso(goalRemain / daysLeft)} 페이스`
                    : "✏️ 목표를 눌러 이번 달 목표를 설정하세요"}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="월 목표 (억)"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  style={{ flex: 1, minWidth: 0, border: "1px solid var(--line)", borderRadius: 12, padding: "9px 11px", fontSize: 15, fontFamily: "inherit", background: "#fffdf9", color: "var(--ink)" }}
                />
                <button className="btn" style={{ padding: "9px 18px", fontSize: 13 }} onClick={saveGoalInline}>
                  저장
                </button>
              </div>
            )}
          </div>

          <div className="stat-line">
            <span>총수익</span>
            <b>{fmtMeso(m.rev)}</b>
          </div>
          <div className="stat-line">
            <span>지출</span>
            <b style={{ color: "var(--danger)" }}>-{fmtMeso(m.exp)}</b>
          </div>
          <div className="stat-line">
            <span>순수익</span>
            <b style={{ color: "var(--accent-deep)" }}>{fmtMeso(m.net)}</b>
          </div>
        </div>

        <div className="panel span-4">
          <div className="card-head">
            <div>
              <div className="card-title">💰 현재 보유 자산</div>
              <div className="card-sub">누적 사냥·보스·가계부 기준</div>
            </div>
            <a className="card-aside" style={{ cursor: "pointer" }} onClick={openAssetEdit}>
              {editAsset ? "닫기" : "✏️ 편집"}
            </a>
          </div>
          {!editAsset ? (
            <>
              <div className="stat-line">
                <span>보유 메소</span>
                <b>{fmtMeso(mesoOnly)}</b>
              </div>
              <div className="stat-line">
                <span>솔 에르다 조각</span>
                <b>
                  {totalSol.toLocaleString("ko-KR")}개 <span className="sub">({fmtMeso(solValue)})</span>
                </b>
              </div>
              <div className="stat-line" style={{ marginTop: 4 }}>
                <span>총 자산 (메소 환산)</span>
                <b style={{ color: "var(--accent-deep)" }}>{fmtMeso(assetTotal)}</b>
              </div>
            </>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>보유 메소 (억)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="예: 12.6"
                  value={assetMeso}
                  onChange={(e) => setAssetMeso(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>보유 솔 에르다 조각 (개)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="예: 240"
                  value={assetSol}
                  onChange={(e) => setAssetSol(e.target.value)}
                />
              </div>
              <button className="btn block" onClick={saveAsset}>
                저장
              </button>
              <div className="note">
                현재 값과의 차이(메소·조각)를 오늘 날짜 <b>사냥 기록(자산 보정)</b>으로 남겨 총자산에 반영합니다.
              </div>
            </>
          )}
        </div>
      </div>

      {/* 월간 달력: 일자별 사냥·가계부, 목요일 주간보스, 1일 월간보스 */}
      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="panel span-12">
          <div className="card-head">
            <div>
              <div className="card-title">월간 현황</div>
              <div className="card-sub">사냥·가계부 일별 집계 · 목요일 주간보스 · 1일 월간보스</div>
            </div>
            <a className="card-aside" onClick={() => onGo("records")}>
              사냥 기록
            </a>
          </div>
          <Calendar
            y={calY}
            m={calM}
            selected=""
            onSelect={() => {}}
            onMove={calMove}
            cell={(ds) => {
              const [yy, mm, dd] = ds.split("-").map(Number);
              const dow = new Date(yy, mm - 1, dd).getDay();
              const huntSum = s.hunts
                .filter((h) => h.date === ds && !isAdjust(h))
                .reduce((a, h) => a + huntNet(h, s.solPrice), 0);
              const led = s.expenses.filter((e) => e.date === ds);
              const ledNet =
                led.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0) -
                led.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
              const bossW = dow === 4 ? weekTotal(s, ds).sum : 0; /* 그 주(목~수) 보스 합계 */
              const bossM = dd === 1 ? monthBossSum(s, monthKey(yy, mm - 1)) : 0; /* 월간보스 */
              const has = huntSum !== 0 || ledNet !== 0 || bossW > 0 || bossM > 0;
              if (!has) return {};
              const row = (label: string, color: string, text: string) => (
                <span style={{ fontSize: "10.5px", fontWeight: 700, color, lineHeight: 1.25, wordBreak: "keep-all" }}>
                  {label} {text}
                </span>
              );
              const body = (
                <div style={{ marginTop: 3, display: "flex", flexDirection: "column", gap: 1 }}>
                  {huntSum > 0 && row("사냥", "var(--accent-deep)", fmtMeso(huntSum))}
                  {ledNet !== 0 &&
                    row("가계부", ledNet >= 0 ? "var(--accent-deep)" : "var(--danger)", (ledNet > 0 ? "+" : "") + fmtMeso(ledNet))}
                  {bossW > 0 && row("보스", "#8163c9", fmtMeso(bossW))}
                  {bossM > 0 && row("월보스", "#8163c9", fmtMeso(bossM))}
                </div>
              );
              return { has: true, body };
            }}
          />
        </div>
      </div>

      {/* 수익원 + 효율 */}
      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="panel span-6">
          <div className="card-title" style={{ marginBottom: 10 }}>
            수익원 비중 (이번 달)
          </div>
          {srcTotal === 0 ? (
            <div className="empty">이번 달 수익 기록이 없어요</div>
          ) : (
            <>
              {srcBar("사냥", srcHunt)}
              {srcBar("보스", srcBoss)}
              {srcBar("판매·기타 수입", srcInc)}
            </>
          )}
        </div>
        <div className="panel span-6">
          <div className="card-title" style={{ marginBottom: 10 }}>
            사냥 효율 (이번 달)
          </div>
          {hm.length === 0 ? (
            <div className="empty">이번 달 사냥 기록이 없어요</div>
          ) : (
            <>
              <div className="stat-line">
                <span>사냥 횟수</span>
                <b>{hm.length}회</b>
              </div>
              <div className="stat-line">
                <span>총 소재비</span>
                <b>
                  {effSoj}개 ({Math.floor(effMin / 60)}시간 {effMin % 60}분)
                </b>
              </div>
              <div className="stat-line">
                <span>솔 에르다 조각</span>
                <b>
                  {effSol}개 ({fmtMeso(effSol * s.solPrice)})
                </b>
              </div>
              <div className="stat-line">
                <span>소재비당 평균 수익</span>
                <b>{effSoj > 0 ? fmtMeso(srcHunt / effSoj) : "-"}</b>
              </div>
              <div className="stat-line">
                <span>회당 평균 수익</span>
                <b>{fmtMeso(srcHunt / hm.length)}</b>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 쌀 장부 + 레벨 */}
      <div className="grid">
        <div className="panel span-6">
          <div className="card-head">
            <div>
              <div className="card-title">🍚 쌀 장부</div>
              <div className="card-sub">현금(원) 기준 · 게임 재화와 독립 집계</div>
            </div>
            <a className="card-aside" onClick={() => onGo("cash")}>
              전체보기
            </a>
          </div>
          {s.cash.length === 0 ? (
            <div className="empty">아직 기록이 없어요.</div>
          ) : (
            <>
              <div className="stat-line">
                <span>이번 달 수입</span>
                <b style={{ color: "var(--accent-deep)" }}>+{fmtWon(cIn)}</b>
              </div>
              <div className="stat-line">
                <span>이번 달 지출</span>
                <b style={{ color: "var(--danger)" }}>-{fmtWon(cOut)}</b>
              </div>
              <div className="stat-line" style={{ marginTop: 8 }}>
                <span>전체 누적 순손익</span>
                <b style={{ color: tNet >= 0 ? "var(--accent-deep)" : "var(--danger)" }}>
                  {tNet > 0 ? "+" : ""}
                  {fmtWon(tNet)}
                </b>
              </div>
            </>
          )}
        </div>
        <div className="panel span-6">
          <div className="card-head">
            <div>
              <div className="card-title">⭐ 레벨</div>
              <div className="card-sub">최근 7일 성장</div>
            </div>
            <a className="card-aside" onClick={() => onGo("level")}>
              전체보기
            </a>
          </div>
          {!lastLv ? (
            <div className="empty">레벨 탭에서 API 연동 후 기록을 불러오세요.</div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Lv. {lastLv.level}{" "}
                <span style={{ color: "var(--accent-deep)", fontSize: 16 }}>{lastLv.rate.toFixed(3)}%</span>
              </div>
              <div className="progress-track" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: Math.min(100, lastLv.rate) + "%" }} />
              </div>
              <div className="stat-line" style={{ marginTop: 4 }}>
                <span>최근 7일 누적</span>
                {l7lv.length ? (
                  <b style={{ color: sum7lv >= 0 ? "var(--accent-deep)" : "var(--danger)" }}>
                    {sum7lv > 0 ? "+" : ""}
                    {sum7lv.toFixed(3)}%
                  </b>
                ) : (
                  <b style={{ color: "var(--ink-soft)" }}>-</b>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
