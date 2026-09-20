"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

/* ── Context ───────────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

/* ── Provider ──────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Mark as exiting first for animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), 3800);
    timers.current.set(id, timer);
  }, [dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { timers.current.forEach(t => clearTimeout(t)); };
  }, []);

  const toast = {
    success: (m: string) => add("success", m),
    error:   (m: string) => add("error",   m),
    warning: (m: string) => add("warning", m),
    info:    (m: string) => add("info",    m),
  };

  const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={18} color="var(--color-income)" />,
    error:   <XCircle      size={18} color="var(--color-expense)" />,
    warning: <AlertTriangle size={18} color="var(--color-warning)" />,
    info:    <Info          size={18} color="var(--accent)" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type} ${t.exiting ? "exiting" : ""}`}
            role="alert"
          >
            <span className="toast-icon">{ICONS[t.type]}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                padding: "0.25rem",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────────────── */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
