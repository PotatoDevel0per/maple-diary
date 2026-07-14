"use client";

import { useState } from "react";
import Modal from "../Modal";
import { useAction, useStore } from "../store";
import { EQUIP_PARTS } from "@/lib/boss-data";
import { equipBuyCost, equipCashValue } from "@/lib/calc";
import { fmtMeso, todayStr } from "@/lib/format";
import type { Equip } from "@/lib/types";
import { addEquip, deleteEquip, sellEquip } from "@/server/actions/records";

export default function Equipment() {
  const { s, set, toast } = useStore();
  const run = useAction();
  const [addOpen, setAddOpen] = useState(false);
  const [sellId, setSellId] = useState<string | null>(null);

  const totBuy = s.equips.reduce((a, e) => a + equipBuyCost(e), 0);
  const totCash = s.equips.reduce((a, e) => a + equipCashValue(e).won, 0);
  const pl = totCash - totBuy;
  const order = (p: string) => {
    const i = EQUIP_PARTS.indexOf(p);
    return i < 0 ? EQUIP_PARTS.length : i;
  };
  const sorted = s.equips.slice().sort((a, b) => order(a.part) - order(b.part));

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">장비</div>
          <div className="page-sub">아이템별 구매·재판매 시세를 기록해 쌀 가치를 집계합니다</div>
        </div>
        <button className="btn" onClick={() => setAddOpen(true)}>
          + 아이템 추가
        </button>
      </div>
      <div className="grid" style={{ marginBottom: 16, gap: 10 }}>
        <div className="panel kpi span-3">
          <div className="label">총 구매 비용</div>
          <div className="value">{totBuy.toLocaleString("ko-KR")}원</div>
        </div>
        <div className="panel kpi span-3">
          <div className="label">총 쌀 가치</div>
          <div className="value">{totCash.toLocaleString("ko-KR")}원</div>
        </div>
        <div className="panel kpi span-3">
          <div className="label">평가 손익</div>
          <div className="value" style={{ color: pl >= 0 ? "var(--accent-deep)" : "#d0524a" }}>
            {pl >= 0 ? "+" : "−"}
            {Math.abs(pl).toLocaleString("ko-KR")}원
          </div>
        </div>
        <div className="panel kpi span-3">
          <div className="label">등록 아이템</div>
          <div className="value">{s.equips.length}개</div>
        </div>
      </div>
      <div className="panel tbl-wrap">
        <div className="card-head">
          <div>
            <div className="card-title">등록 아이템</div>
            <div className="card-sub">행을 클릭하면 재판매 시세를 입력할 수 있어요 · 쌀 가치는 재판매가(없으면 구매가) 기준</div>
          </div>
        </div>
        {s.equips.length === 0 ? (
          <div className="empty" style={{ padding: "22px 12px" }}>
            등록된 아이템이 없어요.
            <br />
            우측 상단 <b>+ 아이템 추가</b>로 슬롯을 만들어보세요.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 78 }}>부위</th>
                <th>아이템</th>
                <th className="num" style={{ width: 120 }}>
                  구매 비용
                </th>
                <th className="num" style={{ width: 130 }}>
                  재판매가
                </th>
                <th className="num" style={{ width: 120 }}>
                  쌀 가치
                </th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => {
                const cv = equipCashValue(e);
                return (
                  <tr key={e.id} className="eq-row" onClick={() => setSellId(e.id)}>
                    <td>
                      <span className="eq-part-tag">{e.part || "-"}</span>
                    </td>
                    <td>
                      <b>{e.name}</b>
                      {e.memo && (
                        <div className="card-sub" style={{ marginTop: 2 }}>
                          {e.memo}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {equipBuyCost(e).toLocaleString("ko-KR")}원
                      <div className="card-sub" style={{ marginTop: 2, whiteSpace: "nowrap" }}>
                        {e.buyDate || ""} · {fmtMeso(e.buyPrice || 0)}
                        {e.tariff ? " · 관세" : ""}
                      </div>
                    </td>
                    <td className="num">
                      {e.sellPrice != null ? (
                        <>
                          {fmtMeso(e.sellPrice)}
                          <div className="card-sub" style={{ marginTop: 2 }}>
                            {e.sellDate || ""}
                          </div>
                        </>
                      ) : (
                        <span className="eq-need">미평가</span>
                      )}
                    </td>
                    <td className="num">
                      {cv.won.toLocaleString("ko-KR")}원
                      {cv.based === "buy" && (
                        <div className="card-sub" style={{ marginTop: 2 }}>
                          구매가 기준
                        </div>
                      )}
                    </td>
                    <td className="num">
                      <button
                        className="del"
                        aria-label="삭제"
                        onClick={async (ev) => {
                          ev.stopPropagation();
                          await run(() => deleteEquip(e.id));
                          set((p) => ({ ...p, equips: p.equips.filter((x) => x.id !== e.id) }));
                          toast("삭제했어요");
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {addOpen && <AddModal onClose={() => setAddOpen(false)} />}
      {sellId && <SellModal id={sellId} onClose={() => setSellId(null)} />}
    </section>
  );
}

const n = (v: string) => {
  const x = parseFloat(v);
  return isNaN(x) || x < 0 ? 0 : x;
};

function AddModal({ onClose }: { onClose: () => void }) {
  const { s, set, toast } = useStore();
  const run = useAction();
  const [part, setPart] = useState(EQUIP_PARTS[0]);
  const [date, setDate] = useState(todayStr());
  const [name, setName] = useState("");
  const [buy, setBuy] = useState("");
  const [buyMkt, setBuyMkt] = useState(String(s.mktPrice || ""));
  const [buyRice, setBuyRice] = useState(String(s.cashPrice || ""));
  const [tariff, setTariff] = useState(false);
  const [memo, setMemo] = useState("");

  const cost = Math.round(n(buy) * (tariff ? 1.1 : 1) * n(buyRice));

  const submit = async () => {
    if (!name.trim()) return toast("아이템 이름을 입력하세요");
    if (n(buy) === 0) return toast("구매가를 입력하세요");
    const input: Omit<Equip, "id"> = {
      name: name.trim(),
      part,
      memo: memo.trim(),
      buyDate: date,
      buyPrice: Math.round(n(buy) * 1e8),
      buyMkt: Math.round(n(buyMkt)),
      buyRice: Math.round(n(buyRice)),
      tariff,
      sellDate: "",
      sellPrice: null,
      sellMkt: null,
      sellRice: null,
    };
    const row = await run(() => addEquip(input));
    if (!row) return;
    set((p) => ({
      ...p,
      equips: [...p.equips, row],
      mktPrice: row.buyMkt || p.mktPrice,
      cashPrice: row.buyRice || p.cashPrice,
    }));
    onClose();
    toast("저장했어요");
  };

  return (
    <Modal title="아이템 추가 (구매 정보)" onClose={onClose} onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <label>부위</label>
          <select value={part} onChange={(e) => setPart(e.target.value)}>
            {EQUIP_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>구매 날짜</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>아이템 이름</label>
        <input type="text" placeholder="예: 앱솔랩스 무기" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>구매가 (억 단위)</label>
        <input type="number" min="0" step="0.1" placeholder="120" value={buy} onChange={(e) => setBuy(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>구매일 메소마켓 (1억당 메포)</label>
          <input type="number" min="0" step="10" placeholder="2600" value={buyMkt} onChange={(e) => setBuyMkt(e.target.value)} />
        </div>
        <div className="field">
          <label>구매일 쌀 시세 (1억당 원)</label>
          <input type="number" min="0" step="10" placeholder="1900" value={buyRice} onChange={(e) => setBuyRice(e.target.value)} />
        </div>
      </div>
      <label className="eq-check">
        <input type="checkbox" checked={tariff} onChange={(e) => setTariff(e.target.checked)} /> 타 서버 구매 (관세 10% 추가)
      </label>
      <div className="field">
        <label>메모 (선택)</label>
        <input type="text" placeholder="예: 22성 추옵 스공" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="preview-line">
        구매 비용: {cost.toLocaleString("ko-KR")}원{tariff ? " (관세 10% 포함)" : ""}
      </div>
    </Modal>
  );
}

function SellModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { s, set, toast } = useStore();
  const run = useAction();
  const e = s.equips.find((x) => x.id === id);
  const [date, setDate] = useState(e?.sellDate || todayStr());
  const [sell, setSell] = useState(e?.sellPrice != null ? String(e.sellPrice / 1e8) : "");
  const [sellMkt, setSellMkt] = useState(String(e?.sellMkt ?? s.mktPrice ?? ""));
  const [sellRice, setSellRice] = useState(String(e?.sellRice ?? s.cashPrice ?? ""));
  if (!e) return null;

  const won = Math.round(n(sell) * n(sellRice));

  const submit = async () => {
    if (n(sell) === 0) return toast("재판매 시세를 입력하세요");
    const input = { sellDate: date, sellPrice: Math.round(n(sell) * 1e8), sellMkt: Math.round(n(sellMkt)), sellRice: Math.round(n(sellRice)) };
    const patch = await run(() => sellEquip(id, input));
    if (!patch) return;
    set((p) => ({
      ...p,
      equips: p.equips.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      mktPrice: patch.sellMkt || p.mktPrice,
      cashPrice: patch.sellRice || p.cashPrice,
    }));
    onClose();
    toast("저장했어요");
  };

  return (
    <Modal title="재판매 시세 입력" onClose={onClose} onSubmit={submit}>
      <div className="field">
        <label>아이템</label>
        <input type="text" value={e.name} readOnly />
      </div>
      <div className="field-row">
        <div className="field">
          <label>기준 날짜</label>
          <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
        </div>
        <div className="field">
          <label>재판매 시세 (억 단위)</label>
          <input type="number" min="0" step="0.1" placeholder="130" value={sell} onChange={(ev) => setSell(ev.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>해당일 메소마켓 (1억당 메포)</label>
          <input type="number" min="0" step="10" placeholder="2600" value={sellMkt} onChange={(ev) => setSellMkt(ev.target.value)} />
        </div>
        <div className="field">
          <label>해당일 쌀 시세 (1억당 원)</label>
          <input type="number" min="0" step="10" placeholder="1900" value={sellRice} onChange={(ev) => setSellRice(ev.target.value)} />
        </div>
      </div>
      <div className="preview-line">쌀 가치: {won.toLocaleString("ko-KR")}원</div>
      <div className="note">메이플 경매장에서 직접 파악한 시세를 입력하세요. 쌀 가치 = 재판매가 × 쌀 시세.</div>
    </Modal>
  );
}
