"use client";

import { useState } from "react";
import Calendar from "../Calendar";
import Modal from "../Modal";
import { useAction, useStore } from "../store";
import { CASH_CATS } from "@/lib/boss-data";
import { fmtWon, fmtWonShort, todayStr } from "@/lib/format";
import type { Kind } from "@/lib/types";
import { addCash, deleteCash } from "@/server/actions/records";

export default function Cash() {
  const { s, set, toast } = useStore();
  const run = useAction();
  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const [sel, setSel] = useState(todayStr());
  const [modal, setModal] = useState<Kind | null>(null);

  const move = (d: number) => {
    let nm = m + d,
      ny = y;
    if (nm < 0) (nm = 11), ny--;
    if (nm > 11) (nm = 0), ny++;
    setM(nm);
    setY(ny);
  };

  const dayLed = s.cash.filter((e) => e.date === sel);
  const mm = String(m + 1).padStart(2, "0");
  const monthLed = s.cash.filter((e) => e.date.startsWith(`${y}-${mm}-`));
  const mInc = monthLed.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
  const mOut = monthLed.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
  const tInc = s.cash.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
  const tOut = s.cash.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
  const tNet = tInc - tOut;
  const [sm, sd] = [+sel.split("-")[1], +sel.split("-")[2]];

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">쌀 장부</div>
          <div className="page-sub">현금(원) 기준 장부 · 캐시 충전, 메소 현금 거래 등을 기록합니다 · 게임 재화 집계와 독립</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn income" onClick={() => setModal("in")}>
            + 수입
          </button>
          <button className="btn danger" onClick={() => setModal("out")}>
            − 지출
          </button>
        </div>
      </div>
      <div className="grid">
        <div className="panel span-8">
          <Calendar
            y={y}
            m={m}
            selected={sel}
            onSelect={setSel}
            onMove={move}
            cell={(ds) => {
              const led = s.cash.filter((e) => e.date === ds);
              if (!led.length) return {};
              const inc = led.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
              const out = led.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
              const n = inc - out;
              return { has: true, net: n, netStr: (n > 0 ? "+" : "") + fmtWonShort(n), sub: led.length + "건" };
            }}
          />
          <div className="note">셀 금액은 그 날의 순액(수입 − 지출)입니다.</div>
        </div>
        <div className="span-4">
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div className="card-title">
                {sm}월 {sd}일
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a className="pill-in" onClick={() => setModal("in")}>
                  + 수입
                </a>
                <a className="pill-out" onClick={() => setModal("out")}>
                  − 지출
                </a>
              </div>
            </div>
            {dayLed.length === 0 ? (
              <div className="empty" style={{ padding: "18px 12px" }}>
                이 날의 기록이 없어요
              </div>
            ) : (
              dayLed.map((e) => (
                <div key={e.id} className="mini-item">
                  <div>
                    <div className="t1">
                      {e.title || e.cat}{" "}
                      <span className="tag" style={{ fontSize: 10, padding: "1px 7px" }}>
                        {e.cat}
                      </span>
                    </div>
                    <div className="t2">{e.kind === "in" ? "수입" : "지출"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div className="amt" style={{ color: e.kind === "in" ? "var(--accent-deep)" : "var(--danger)" }}>
                      {e.kind === "in" ? "+" : "-"}
                      {fmtWon(e.amount)}
                    </div>
                    <button
                      className="del"
                      aria-label="삭제"
                      onClick={async () => {
                        await run(() => deleteCash(e.id));
                        set((p) => ({ ...p, cash: p.cash.filter((x) => x.id !== e.id) }));
                        toast("삭제했어요");
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>
              {m + 1}월 요약
            </div>
            <div className="stat-line">
              <span>수입</span>
              <b style={{ color: "var(--accent-deep)" }}>+{fmtWon(mInc)}</b>
            </div>
            <div className="stat-line">
              <span>지출</span>
              <b style={{ color: "var(--danger)" }}>-{fmtWon(mOut)}</b>
            </div>
            <div className="stat-line">
              <span>순액</span>
              <b>{fmtWon(mInc - mOut)}</b>
            </div>
          </div>
          <div className="panel">
            <div className="card-title" style={{ marginBottom: 8 }}>
              전체 누적
            </div>
            <div className="stat-line">
              <span>총 투자 (지출)</span>
              <b style={{ color: "var(--danger)" }}>-{fmtWon(tOut)}</b>
            </div>
            <div className="stat-line">
              <span>총 회수 (수입)</span>
              <b style={{ color: "var(--accent-deep)" }}>+{fmtWon(tInc)}</b>
            </div>
            <div className="stat-line">
              <span>순손익</span>
              <b style={{ color: tNet >= 0 ? "var(--accent-deep)" : "var(--danger)" }}>
                {tNet > 0 ? "+" : ""}
                {fmtWon(tNet)}
              </b>
            </div>
          </div>
        </div>
      </div>

      {modal && <CashModal kind={modal} defaultDate={sel} onClose={() => setModal(null)} onSaved={setSel} />}
    </section>
  );
}

function CashModal({ kind, defaultDate, onClose, onSaved }: { kind: Kind; defaultDate: string; onClose: () => void; onSaved: (ds: string) => void }) {
  const { set, toast } = useStore();
  const run = useAction();
  const [k, setK] = useState<Kind>(kind);
  const [date, setDate] = useState(defaultDate);
  const [cat, setCat] = useState(CASH_CATS[kind][0]);
  const [amt, setAmt] = useState("");
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const n = (v: string) => {
    const x = parseFloat(v);
    return isNaN(x) || x < 0 ? 0 : x;
  };

  /* 메소 수량 × 억당 가격 → 금액/항목 자동 채움 */
  const onCalc = (nq: string, np: string) => {
    const q = n(nq),
      p = n(np);
    if (q > 0 && p > 0) {
      setAmt(String(Math.round(q * p)));
      if (!title.trim()) {
        const verb = k === "in" ? "판매" : "구매";
        setTitle(`쌀 ${verb} (${q}억, 억당 ${p.toLocaleString("ko-KR")}원)`);
      }
    }
  };

  const submit = async () => {
    if (!date) return toast("날짜를 입력하세요");
    if (n(amt) === 0) return toast("금액을 입력하세요");
    const input = { date, kind: k, cat, title: title.trim(), amount: Math.round(n(amt)) };
    const row = await run(() => addCash(input));
    if (!row) return;
    set((p) => ({ ...p, cash: [...p.cash, row] }));
    onSaved(date);
    onClose();
    toast("저장했어요");
  };

  return (
    <Modal title="쌀 장부 기록" onClose={onClose} onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <label>유형</label>
          <select
            value={k}
            onChange={(e) => {
              const nk = e.target.value as Kind;
              setK(nk);
              setCat(CASH_CATS[nk][0]);
            }}
          >
            <option value="out">지출 (−)</option>
            <option value="in">수입 (+)</option>
          </select>
        </div>
        <div className="field">
          <label>날짜</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>분류</label>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CASH_CATS[k].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>금액 (원)</label>
          <input type="number" min="0" step="100" placeholder="30000" value={amt} onChange={(e) => setAmt(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>메소 수량 (억) · 선택</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="50"
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              onCalc(e.target.value, price);
            }}
          />
        </div>
        <div className="field">
          <label>억당 가격 (원) · 선택</label>
          <input
            type="number"
            min="0"
            step="10"
            placeholder="1850"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              onCalc(qty, e.target.value);
            }}
          />
        </div>
      </div>
      <div className="field">
        <label>항목</label>
        <input type="text" placeholder="예: 제네시스 패스 구매" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="preview-line">
        {k === "in" ? "+" : "-"}
        {fmtWon(n(amt))}
      </div>
      <div className="note">메소 수량과 억당 가격을 입력하면 금액과 항목이 자동으로 채워집니다.</div>
    </Modal>
  );
}
