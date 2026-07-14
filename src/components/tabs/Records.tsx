"use client";

import { useState } from "react";
import Calendar from "../Calendar";
import Modal from "../Modal";
import { useAction, useStore } from "../store";
import { huntNet } from "@/lib/calc";
import { fmtMeso, todayStr } from "@/lib/format";
import { addHunt, deleteHunt } from "@/server/actions/records";

export default function Records() {
  const { s, set, toast } = useStore();
  const run = useAction();
  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const [sel, setSel] = useState(todayStr());
  const [open, setOpen] = useState(false);

  const move = (d: number) => {
    let nm = m + d,
      ny = y;
    if (nm < 0) {
      nm = 11;
      ny--;
    }
    if (nm > 11) {
      nm = 0;
      ny++;
    }
    setM(nm);
    setY(ny);
  };

  const dayHunts = s.hunts.filter((h) => h.date === sel);
  const mm = String(m + 1).padStart(2, "0");
  const monthHunts = s.hunts.filter((h) => h.date.startsWith(`${y}-${mm}-`));
  const soj = Math.round(monthHunts.reduce((a, h) => a + h.sojaebi, 0));
  const sol = monthHunts.reduce((a, h) => a + (h.sol || 0), 0);
  const net = monthHunts.reduce((a, h) => a + huntNet(h, s.solPrice), 0);
  const min = Math.round(soj * 30);

  const [sm, sd] = [+sel.split("-")[1], +sel.split("-")[2]];

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">사냥 기록</div>
          <div className="page-sub">캘린더에서 날짜를 선택해 기록하세요 · 1 소재비 = 30분</div>
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
              const hs = s.hunts.filter((h) => h.date === ds);
              if (!hs.length) return {};
              const n = hs.reduce((a, h) => a + huntNet(h, s.solPrice), 0);
              const sj = Math.round(hs.reduce((a, h) => a + h.sojaebi, 0));
              return { has: true, net: n, netStr: fmtMeso(n), sub: "소재비 " + sj };
            }}
          />
        </div>
        <div className="span-4">
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div className="card-title">
                {sm}월 {sd}일 기록
              </div>
              <a className="pill-in" onClick={() => setOpen(true)}>
                + 추가
              </a>
            </div>
            {dayHunts.length === 0 ? (
              <div className="empty" style={{ padding: "22px 12px" }}>
                이 날의 기록이 없어요.
                <br />+ 추가를 눌러 기록하세요
              </div>
            ) : (
              dayHunts.map((h) => (
                <div key={h.id} className="mini-item">
                  <div>
                    <div className="t1">{fmtMeso(huntNet(h, s.solPrice))}</div>
                    <div className="t2">
                      소재비 {h.sojaebi}개 · 메소 {fmtMeso(h.meso)} · 솔 조각 {h.sol || 0}개
                      {h.memo ? (
                        <>
                          <br />
                          {h.memo}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="del"
                    aria-label="삭제"
                    onClick={async () => {
                      await run(() => deleteHunt(h.id));
                      set((p) => ({ ...p, hunts: p.hunts.filter((x) => x.id !== h.id) }));
                      toast("삭제했어요");
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="panel">
            <div className="card-title" style={{ marginBottom: 8 }}>
              {m + 1}월 요약
            </div>
            {monthHunts.length === 0 ? (
              <div className="empty" style={{ padding: "20px 12px" }}>
                이 달의 사냥 기록이 없어요.
              </div>
            ) : (
              <>
                <div className="stat-line">
                  <span>사냥 횟수</span>
                  <b>{monthHunts.length}회</b>
                </div>
                <div className="stat-line">
                  <span>총 소재비</span>
                  <b>
                    {soj}개 ({Math.floor(min / 60)}시간 {min % 60}분)
                  </b>
                </div>
                <div className="stat-line">
                  <span>솔 에르다 조각</span>
                  <b>{sol}개</b>
                </div>
                <div className="stat-line">
                  <span>소재비당 수익</span>
                  <b>{soj > 0 ? fmtMeso(net / soj) : "-"}</b>
                </div>
                <div className="stat-line">
                  <span>총 수익</span>
                  <b style={{ color: "var(--accent-deep)" }}>{fmtMeso(net)}</b>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {open && <HuntModal defaultDate={sel} onClose={() => setOpen(false)} onSaved={(ds) => setSel(ds)} />}
    </section>
  );
}

function HuntModal({ defaultDate, onClose, onSaved }: { defaultDate: string; onClose: () => void; onSaved: (ds: string) => void }) {
  const { s, set, toast } = useStore();
  const run = useAction();
  const [date, setDate] = useState(defaultDate);
  const [soj, setSoj] = useState("");
  const [meso, setMeso] = useState("");
  const [sol, setSol] = useState("");
  const [memo, setMemo] = useState("");

  const n = (v: string) => {
    const x = parseFloat(v);
    return isNaN(x) || x < 0 ? 0 : x;
  };
  const total = n(meso) * 1e8 + Math.round(n(sol)) * s.solPrice;

  const submit = async () => {
    if (!date) return toast("날짜를 입력하세요");
    const input = { date, sojaebi: Math.round(n(soj)), meso: Math.round(n(meso) * 1e8), sol: Math.round(n(sol)), memo: memo.trim() };
    const row = await run(() => addHunt(input));
    if (!row) return;
    set((p) => ({ ...p, hunts: [...p.hunts, row] }));
    onSaved(date);
    onClose();
    toast("저장했어요");
  };

  return (
    <Modal title="사냥 추가" onClose={onClose} onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <label>날짜</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>소재비 (개) · 1개 = 30분</label>
          <input type="number" min="0" step="1" placeholder="2" value={soj} onChange={(e) => setSoj(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>메소 수익 (억 단위)</label>
          <input type="number" min="0" step="0.1" placeholder="1.3" value={meso} onChange={(e) => setMeso(e.target.value)} />
        </div>
        <div className="field">
          <label>솔 에르다 조각 (개)</label>
          <input type="number" min="0" step="1" placeholder="0" value={sol} onChange={(e) => setSol(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>메모 (선택)</label>
        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="preview-line">총 수익: {fmtMeso(total)}</div>
      <div className="note">메소 수익 1.3 = 1억 3,000만 메소 · 솔 조각 시세 {fmtMeso(s.solPrice)}/개 적용</div>
    </Modal>
  );
}
