"use client";

import { useState } from "react";
import type { DiaryState } from "@/lib/types";
import { StoreProvider, useStore } from "./store";
import { doSignOut } from "@/server/actions/auth";
import Dashboard from "./tabs/Dashboard";
import Records from "./tabs/Records";
import Boss from "./tabs/Boss";
import Expenses from "./tabs/Expenses";
import Cash from "./tabs/Cash";
import Level from "./tabs/Level";
import Equipment from "./tabs/Equipment";
import Settings from "./tabs/Settings";

const TABS = [
  { v: "dashboard", ico: "🏠", txt: "대시보드" },
  { v: "records", ico: "📋", txt: "사냥" },
  { v: "boss", ico: "👑", txt: "보스" },
  { v: "expenses", ico: "💳", txt: "가계부" },
  { v: "cash", ico: "🍚", txt: "쌀 장부" },
  { v: "level", ico: "⭐", txt: "레벨" },
  { v: "equipment", ico: "🗡️", txt: "장비" },
  { v: "settings", ico: "⚙️", txt: "설정" },
] as const;

type View = (typeof TABS)[number]["v"];

function Shell() {
  const { s, toasts } = useStore();
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="layout">
      <aside>
        <div className="logo">
          <span className="leaf">🍁</span>
          <span>Maple Diary</span>
        </div>
        <div className="logo-sub">메이플 수익 기록장</div>
        <nav>
          {TABS.map((t) => (
            <button key={t.v} className={view === t.v ? "on" : ""} onClick={() => setView(t.v)}>
              <span className="ico">{t.ico}</span>
              <span className="txt">{t.txt}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="side-profile">
            <div className="avatar">
              {s.charImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.charImage}
                  alt={s.mapleName || s.profile.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(2.1) translateY(2%)" }}
                />
              ) : (
                s.profile.name.slice(0, 1) || "용"
              )}
            </div>
            <div>
              <div className="name">{s.profile.name} 님</div>
              <div className="greet">{s.profile.greet}</div>
              <button className="side-logout" onClick={() => doSignOut()}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main>
        {view === "dashboard" && <Dashboard onGo={setView} />}
        {view === "records" && <Records />}
        {view === "boss" && <Boss />}
        {view === "expenses" && <Expenses />}
        {view === "cash" && <Cash />}
        {view === "level" && <Level />}
        {view === "equipment" && <Equipment />}
        {view === "settings" && <Settings />}
      </main>

      {toasts.map((t) => (
        <div key={t.id} className="toast show">
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export default function App({ initial }: { initial: DiaryState; userName: string }) {
  return (
    <StoreProvider initial={initial}>
      <Shell />
    </StoreProvider>
  );
}
