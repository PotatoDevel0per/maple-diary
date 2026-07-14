"use client";

import { useState } from "react";
import Calendar from "../Calendar";
import Modal from "../Modal";
import { useAction, useStore } from "../store";
import { LED_CATS } from "@/lib/boss-data";
import { fmtMeso, todayStr } from "@/lib/format";
import type { Kind } from "@/lib/types";
import { addLedger, deleteLedger } from "@/server/actions/records";

export default function Expenses() {
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

  const dayLed = s.expenses.filter((e) => e.date === sel);
  const mm = String(m + 1).padStart(2, "0");
  const monthLed = s.expenses.filter((e) => e.date.startsWith(`${y}-${mm}-`));
  const mInc = monthLed.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
  const mOut = monthLed.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
  const [sm, sd] = [+sel.split("-")[1], +sel.split("-")[2]];

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">가계부</div>
          <div className="page-sub">아이템 구매·판매 등 수입(+)과 지출(−)을 일자별로 기록하세요</div>
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
              const led = s.expenses.filter((e) => e.date === ds);
              if (!led.length) return {};
              const inc = led.filter((e) => e.kind === "in").reduce((a, e) => a + e.amount, 0);
              const out = led.filter((e) => e.kind !== "in").reduce((a, e) => a + e.amount, 0);
              const n = inc - out;
              return { has: true, net: n, netStr: (n > 0 ? "+" : "") + fmtMeso(n), sub: led.length + "건" };
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
                      {fmtMeso(e.amount)}
                    </div>
                    <button
                      className="del"
                      aria-label="삭제"
                      onClick={async () => {
                        await run(() => deleteLedger(e.id));
                        set((p) => ({ ...p, expenses: p.expenses.filter((x) => x.id !== e.id) }));
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
              <b style={{ color: "var(--accent-deep)" }}>+{fmtMeso(mInc)}</b>
            </div>
            <div className="stat-line">
              <span>지출</span>
              <b style={{ color: "var(--danger)" }}>-{fmtMeso(mOut)}</b>
            </div>
            <div className="stat-line">
              <span>순액</span>
              <b>{fmtMeso(mInc - mOut)}</b>
            </div>
          </div>
        </div>
      </div>

      {modal && <LedgerModal kind={modal} defaultDate={sel} onClose={() => setModal(null)} onSaved={setSel} />}
    </section>
  );
}

function LedgerModal({ kind, defaultDate, onClose, onSaved }: { kind: Kind; defaultDate: string; onClose: () => void; onSaved: (ds: string) => void }) {
  const { set, toast } = useStore();
  const run = useAction();
  const [k, setK] = useState<Kind>(kind);
  const [date, setDate] = useState(defaultDate);
  const [cat, setCat] = useState(LED_CATS[kind][0]);
  const [amt, setAmt] = useState("");
  const [title, setTitle] = useState("");

  const n = (v: string) => {
    const x = parseFloat(v);
    return isNaN(x) || x < 0 ? 0 : x;
  };

  const submit = async () => {
    if (!date) return toast("날짜를 입력하세요");
    if (n(amt) === 0) return toast("금액을 입력하세요");
    const input = { date, kind: k, cat, title: title.trim(), amount: Math.round(n(amt) * 1e8) };
    const row = await run(() => addLedger(input));
    if (!row) return;
    set((p) => ({ ...p, expenses: [...p.expenses, row] }));
    onSaved(date);
    onClose();
    toast("저장했어요");
  };

  return (
    <Modal title="가계부 기록" onClose={onClose} onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <label>유형</label>
          <select
            value={k}
            onChange={(e) => {
              const nk = e.target.value as Kind;
              setK(nk);
              setCat(LED_CATS[nk][0]);
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
            {LED_CATS[k].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>금액 (억 단위)</label>
          <input type="number" min="0" step="0.1" placeholder="1.3" value={amt} onChange={(e) => setAmt(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>항목</label>
        <input type="text" placeholder="예: 주문의 흔적 주문서 / 에테르넬 판매" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="preview-line">
        {k === "in" ? "+" : "-"}
        {fmtMeso(n(amt) * 1e8)}
      </div>
    </Modal>
  );
}
