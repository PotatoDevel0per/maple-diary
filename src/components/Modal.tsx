"use client";

import { useEffect } from "react";

export default function Modal({
  title,
  onClose,
  onSubmit,
  submitLabel = "저장",
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && onSubmit) onSubmit();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, onSubmit]);

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        {onSubmit && (
          <div className="modal-actions">
            <button className="btn ghost" onClick={onClose}>
              취소
            </button>
            <button className="btn" onClick={onSubmit}>
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
