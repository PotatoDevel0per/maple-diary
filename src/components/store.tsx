"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { DiaryState } from "@/lib/types";

interface Toast {
  id: number;
  msg: string;
}

interface Store {
  s: DiaryState;
  set: (updater: (prev: DiaryState) => DiaryState) => void;
  toast: (msg: string) => void;
  toasts: Toast[];
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ initial, children }: { initial: DiaryState; children: React.ReactNode }) {
  const [s, setS] = useState<DiaryState>(initial);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const set = useCallback((updater: (prev: DiaryState) => DiaryState) => setS(updater), []);

  const toast = useCallback((msg: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1800);
  }, []);

  const value = useMemo(() => ({ s, set, toast, toasts }), [s, toasts, set, toast]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider 밖에서 useStore 호출");
  return c;
}

/** 서버 액션 호출을 감싸 에러 시 토스트를 띄우는 헬퍼 */
export function useAction() {
  const { toast } = useStore();
  return useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "오류가 발생했어요");
        return undefined;
      }
    },
    [toast]
  );
}
