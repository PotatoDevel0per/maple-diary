"use client";

import { useState } from "react";
import { useAction, useStore } from "../store";
import { saveNexon, savePrices, saveProfile } from "@/server/actions/settings";

export default function Settings() {
  const { s, set, toast } = useStore();
  const run = useAction();
  const [name, setName] = useState(s.profile.name);
  const [greet, setGreet] = useState(s.profile.greet);
  const [nxKey, setNxKey] = useState("");
  const [nxName, setNxName] = useState(s.mapleName);
  const [mkt, setMkt] = useState(String(s.mktPrice || ""));
  const [rice, setRice] = useState(String(s.cashPrice || ""));
  const [sol, setSol] = useState(String(Math.round(s.solPrice / 1e4)));

  const onProfile = async () => {
    const r = await run(() => saveProfile(name, greet));
    if (!r) return;
    set((p) => ({ ...p, profile: r }));
    toast("프로필을 저장했어요");
  };

  const onNexon = async () => {
    const r = await run(() => saveNexon(nxKey, nxName));
    if (!r) return;
    set((p) => ({ ...p, hasNexonKey: r.hasNexonKey, mapleName: r.mapleName, charImage: r.charImage }));
    setNxKey("");
    toast(r.hasNexonKey && r.mapleName ? "API 연동 정보를 저장했어요" : "저장했어요 (키와 닉네임을 모두 입력해야 조회할 수 있어요)");
  };

  const onPrices = async () => {
    const r = await run(() =>
      savePrices({ mktPrice: parseFloat(mkt), cashPrice: parseFloat(rice), solPrice: parseFloat(sol) * 1e4 })
    );
    if (!r) return;
    set((p) => ({ ...p, mktPrice: r.mktPrice, cashPrice: r.cashPrice, solPrice: r.solPrice }));
    toast("시세를 저장했어요 · 환산이 다시 계산됩니다");
  };

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="page-title">설정</div>
          <div className="page-sub">프로필과 데이터를 관리하세요</div>
        </div>
      </div>
      <div className="grid">
        <div className="panel span-6">
          <div className="card-title" style={{ marginBottom: 14 }}>
            프로필
          </div>
          <div className="field">
            <label>캐릭터 이름</label>
            <input type="text" placeholder="캐릭터 이름" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>인사말</label>
            <input type="text" placeholder="오늘도 재획 화이팅" value={greet} onChange={(e) => setGreet(e.target.value)} />
          </div>
          <button className="btn block" onClick={onProfile}>
            프로필 저장
          </button>
        </div>

        <div className="panel span-6">
          <div className="card-title" style={{ marginBottom: 14 }}>
            Nexon Open API
          </div>
          <div className="field">
            <label>API 키 {s.hasNexonKey && <span className="card-sub">· 저장됨 (변경 시에만 입력)</span>}</label>
            <input type="password" placeholder={s.hasNexonKey ? "••••••••" : "openapi.nexon.com에서 발급"} value={nxKey} onChange={(e) => setNxKey(e.target.value)} />
          </div>
          <div className="field">
            <label>캐릭터 닉네임</label>
            <input type="text" placeholder="예: 석사생프리렌" value={nxName} onChange={(e) => setNxName(e.target.value)} />
          </div>
          <button className="btn block" onClick={onNexon}>
            API 연동 저장
          </button>
          <div className="note">레벨 탭의 경험치 기록에 사용됩니다. 키는 서버에만 저장되고 브라우저로는 전송되지 않아요.</div>
        </div>

        <div className="panel span-6">
          <div className="card-title" style={{ marginBottom: 4 }}>
            시세 (전역 공유)
          </div>
          <div className="card-sub" style={{ marginBottom: 12 }}>
            모든 탭의 쌀·수익 환산에 이 시세가 적용됩니다
          </div>
          <div className="field">
            <label>메소마켓 (1억당 메포)</label>
            <input type="number" min="0" step="10" placeholder="2600" value={mkt} onChange={(e) => setMkt(e.target.value)} />
          </div>
          <div className="field">
            <label>쌀 시세 (1억당 원)</label>
            <input type="number" min="0" step="10" placeholder="1900" value={rice} onChange={(e) => setRice(e.target.value)} />
          </div>
          <div className="field">
            <label>솔 에르다 조각 (만 메소 / 개)</label>
            <input type="number" min="0" step="10" placeholder="570" value={sol} onChange={(e) => setSol(e.target.value)} />
          </div>
          <button className="btn block" onClick={onPrices}>
            시세 저장
          </button>
          <div className="note">쌀 시세는 쌀 복구 환산에, 솔 시세는 사냥 수익 계산에 쓰입니다.</div>
        </div>

        <div className="panel span-6">
          <div className="card-title" style={{ marginBottom: 14 }}>
            데이터
          </div>
          <div className="note">
            데이터는 서버 데이터베이스(계정별)에 안전하게 저장됩니다. 로그인만 하면 어느 기기에서든 이어서 사용할 수 있어요.
          </div>
        </div>
      </div>
    </section>
  );
}
