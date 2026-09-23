"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Clock,
  LogOut,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";

export interface SessionSecurityConfig {
  /** Timeout in minutes of inactivity before session expires */
  inactivityTimeoutMinutes: number;
  /** Whether to require a new session login if the browser was closed/rebooted */
  closeOnBrowserExit: boolean;
  /** Show the countdown warning modal before logging out */
  showWarningModal: boolean;
  /** Seconds before timeout when the warning modal appears */
  warningCountdownSeconds: number;
  /** Maximum continuous session lifetime in hours (0 = unlimited) */
  maxSessionHours: number;
}

const DEFAULT_CONFIG: SessionSecurityConfig = {
  inactivityTimeoutMinutes: 15,
  closeOnBrowserExit: true,
  showWarningModal: true,
  warningCountdownSeconds: 60,
  maxSessionHours: 12,
};

const STORAGE_KEYS = {
  CONFIG: "achouse_session_security_config",
  LAST_ACTIVE: "achouse_last_active_timestamp",
  SESSION_START: "achouse_session_start_timestamp",
  SESSION_TOKEN: "achouse_tab_session_token", // in sessionStorage to detect fresh browser/tab launches
  LOGOUT_EVENT: "achouse_logout_broadcast_event",
};

interface SessionSecurityContextType {
  config: SessionSecurityConfig;
  updateConfig: (newConfig: Partial<SessionSecurityConfig>) => void;
  remainingSeconds: number;
  isWarningOpen: boolean;
  extendSession: () => void;
  lockSessionNow: (reason?: string) => void;
  sessionStartTime: number;
  lastActiveTime: number;
}

const SessionSecurityContext = createContext<SessionSecurityContextType | null>(null);

export function useSessionSecurity() {
  const context = useContext(SessionSecurityContext);
  if (!context) {
    throw new Error("useSessionSecurity must be used within a SessionSecurityProvider");
  }
  return context;
}

const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const hasValidClerkKey =
  Boolean(pubKey) &&
  (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
  !pubKey.includes("REEMPLAZAR") &&
  pubKey.length > 20;

export function SessionSecurityProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const router = useRouter();

  let clerkSignOut: (() => Promise<void>) | null = null;
  try {
    if (hasValidClerkKey) {
      const clerk = useClerk();
      clerkSignOut = clerk.signOut;
    }
  } catch {
    clerkSignOut = null;
  }

  // Load config from localStorage
  const [config, setConfig] = useState<SessionSecurityConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_CONFIG;
  });

  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    if (typeof window === "undefined") return Date.now();
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION_START);
      if (saved) return parseInt(saved, 10);
    } catch {}
    return Date.now();
  });

  const [lastActiveTime, setLastActiveTime] = useState<number>(() => {
    if (typeof window === "undefined") return Date.now();
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      if (saved) return parseInt(saved, 10);
    } catch {}
    return Date.now();
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    config.inactivityTimeoutMinutes * 60
  );
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const lastActivityReportRef = useRef<number>(Date.now());
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Update config helper
  const updateConfig = useCallback((newConfig: Partial<SessionSecurityConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Complete secure logout function
  const performLogout = useCallback(
    async (reason: "inactivity" | "browser_restart" | "max_lifetime" | "manual" = "inactivity") => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);
      setIsWarningOpen(false);

      try {
        // Broadcast logout event to all tabs
        if (channelRef.current) {
          channelRef.current.postMessage({ type: "ACHOUSE_FORCE_LOGOUT", reason });
        }
        localStorage.setItem(
          STORAGE_KEYS.LOGOUT_EVENT,
          JSON.stringify({ timestamp: Date.now(), reason })
        );
      } catch {}

      // Clean application state & tokens
      try {
        document.cookie = "household_id=; path=/; max-age=0; SameSite=Lax";
        sessionStorage.clear();
        localStorage.removeItem(STORAGE_KEYS.SESSION_START);
        localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE);
        localStorage.removeItem(STORAGE_KEYS.LOGOUT_EVENT);
      } catch {}

      // Clerk or local redirect
      try {
        if (clerkSignOut) {
          await clerkSignOut();
        }
      } catch (err) {
        console.warn("[SessionSecurity] Clerk sign out error:", err);
      }

      window.location.href = `/sign-in?reason=${reason}`;
    },
    [isLoggingOut, clerkSignOut]
  );

  // Extend session (reset activity timer)
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityReportRef.current = now;
    setLastActiveTime(now);
    setIsWarningOpen(false);
    setRemainingSeconds(config.inactivityTimeoutMinutes * 60);

    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "ACHOUSE_SESSION_EXTENDED", timestamp: now });
      }
    } catch {}
  }, [config.inactivityTimeoutMinutes]);

  const lockSessionNow = useCallback(
    (reason = "manual") => {
      performLogout(reason as any);
    },
    [performLogout]
  );

  // 1. Check browser exit / fresh start on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const now = Date.now();
    const inactivityTimeoutMs = config.inactivityTimeoutMinutes * 60 * 1000;
    const maxSessionMs = config.maxSessionHours * 60 * 60 * 1000;

    const storedLastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
    const storedStart = localStorage.getItem(STORAGE_KEYS.SESSION_START);
    const sessionToken = sessionStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);

    // If closeOnBrowserExit is true and this is a brand new browser instance (no sessionStorage token)
    if (config.closeOnBrowserExit && !sessionToken && storedLastActive) {
      const elapsedSinceActive = now - parseInt(storedLastActive, 10);
      // If elapsed time is greater than 2 minutes, assume browser was closed/computer restarted
      if (elapsedSinceActive > 120000) {
        performLogout("browser_restart");
        return;
      }
    }

    // Check if inactivity timeout has already passed while computer was asleep or tab was closed
    if (storedLastActive) {
      const lastActive = parseInt(storedLastActive, 10);
      if (now - lastActive > inactivityTimeoutMs) {
        performLogout("inactivity");
        return;
      }
    }

    // Check if continuous max session lifetime passed
    if (config.maxSessionHours > 0 && storedStart) {
      const start = parseInt(storedStart, 10);
      if (now - start > maxSessionMs) {
        performLogout("max_lifetime");
        return;
      }
    }

    // Initialize session markers
    if (!storedStart) {
      localStorage.setItem(STORAGE_KEYS.SESSION_START, now.toString());
      setSessionStartTime(now);
    }
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
    sessionStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, "active_" + now);
  }, [config, performLogout]);

  // 2. Setup Multi-tab synchronization BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    try {
      const channel = new BroadcastChannel("achouse_session_security_channel");
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (!event?.data) return;
        const { type, timestamp, reason } = event.data;

        if (type === "ACHOUSE_FORCE_LOGOUT") {
          performLogout(reason || "inactivity");
        } else if (type === "ACHOUSE_SESSION_EXTENDED" && timestamp) {
          setLastActiveTime(timestamp);
          lastActivityReportRef.current = timestamp;
          setIsWarningOpen(false);
          setRemainingSeconds(config.inactivityTimeoutMinutes * 60);
        }
      };

      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn("[SessionSecurity] BroadcastChannel initialization error:", e);
    }
  }, [config.inactivityTimeoutMinutes, performLogout]);

  // Fallback storage event listener for cross-tab sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.LOGOUT_EVENT && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          performLogout(data.reason || "inactivity");
        } catch {}
      } else if (e.key === STORAGE_KEYS.LAST_ACTIVE && e.newValue) {
        const ts = parseInt(e.newValue, 10);
        if (!isNaN(ts)) {
          setLastActiveTime(ts);
          lastActivityReportRef.current = ts;
          setIsWarningOpen(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [performLogout]);

  // 3. Activity Listener (throttled)
  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      // Throttle reporting to storage every 4 seconds to maintain ultra-fast performance
      if (now - lastActivityReportRef.current >= 4000) {
        lastActivityReportRef.current = now;
        setLastActiveTime(now);
        try {
          localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
          if (channelRef.current) {
            channelRef.current.postMessage({ type: "ACHOUSE_SESSION_EXTENDED", timestamp: now });
          }
        } catch {}
      }
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll", "wheel", "click"];
    events.forEach((event) => window.addEventListener(event, updateActivity, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 4. Heartbeat interval: checks inactivity and countdown every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLoggingOut) return;

      const now = Date.now();
      const inactivityLimitMs = config.inactivityTimeoutMinutes * 60 * 1000;
      const warningThresholdMs = config.warningCountdownSeconds * 1000;
      const elapsedMs = now - lastActiveTime;
      const remainingMs = Math.max(0, inactivityLimitMs - elapsedMs);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setRemainingSeconds(remainingSec);

      // Check if continuous session lifetime exceeded
      if (config.maxSessionHours > 0) {
        const maxSessionMs = config.maxSessionHours * 60 * 60 * 1000;
        if (now - sessionStartTime >= maxSessionMs) {
          performLogout("max_lifetime");
          return;
        }
      }

      // Check if inactivity timeout reached
      if (elapsedMs >= inactivityLimitMs) {
        performLogout("inactivity");
        return;
      }

      // Check if we should trigger the warning modal
      if (config.showWarningModal && remainingMs <= warningThresholdMs) {
        setIsWarningOpen(true);
      } else if (remainingMs > warningThresholdMs && isWarningOpen) {
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    config,
    lastActiveTime,
    sessionStartTime,
    isWarningOpen,
    isLoggingOut,
    performLogout,
  ]);

  const value: SessionSecurityContextType = {
    config,
    updateConfig,
    remainingSeconds,
    isWarningOpen,
    extendSession,
    lockSessionNow,
    sessionStartTime,
    lastActiveTime,
  };

  return (
    <SessionSecurityContext.Provider value={value}>
      {children}
      {isWarningOpen && (
        <SessionWarningModal
          remainingSeconds={remainingSeconds}
          totalWarningSeconds={config.warningCountdownSeconds}
          onExtend={extendSession}
          onLogout={() => performLogout("inactivity")}
        />
      )}
    </SessionSecurityContext.Provider>
  );
}

/**
 * High-priority Warning Modal before Session Timeout
 */
function SessionWarningModal({
  remainingSeconds,
  totalWarningSeconds,
  onExtend,
  onLogout,
}: {
  remainingSeconds: number;
  totalWarningSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}) {
  const percentage = Math.max(0, Math.min(100, (remainingSeconds / totalWarningSeconds) * 100));
  const formattedTime = `00:${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 9999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        boxSizing: "border-box",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          width: "min(460px, 94vw)",
          backgroundColor: "var(--bg-card)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "0 25px 60px -10px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          animation: "modalSpring 0.35s var(--ease-spring)",
        }}
      >
        {/* Animated Warning Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            border: "2px solid rgba(239, 68, 68, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-expense)",
            marginBottom: "1.25rem",
            boxShadow: "0 0 24px rgba(239, 68, 68, 0.2)",
            animation: "pulseRing 1.5s infinite",
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-expense)",
            background: "rgba(239, 68, 68, 0.1)",
            padding: "0.2rem 0.75rem",
            borderRadius: 999,
            marginBottom: "0.75rem",
          }}
        >
          Protección de Datos Financieros
        </span>

        <h2
          style={{
            fontSize: "1.375rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 0.5rem 0",
            letterSpacing: "-0.02em",
          }}
        >
          ¿Sigues ahí? Tu sesión está por expirar
        </h2>

        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            margin: "0 0 1.5rem 0",
          }}
        >
          Por seguridad de tus cuentas e información financiera, tu sesión en ACHouse se cerrará
          automáticamente por inactividad.
        </p>

        {/* Big Countdown Clock */}
        <div
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "var(--radius-xl)",
            backgroundColor: "var(--bg-card-alt)",
            border: "1px solid var(--border-default)",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
            <Clock size={16} color="var(--color-expense)" /> Tiempo restante para bloqueo:
          </div>
          <div
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              fontFamily: "monospace",
              color: remainingSeconds <= 15 ? "var(--color-expense)" : "var(--text-primary)",
              letterSpacing: "0.05em",
            }}
          >
            {formattedTime}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: 6,
              borderRadius: 999,
              backgroundColor: "var(--border-subtle)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${percentage}%`,
                backgroundColor:
                  remainingSeconds <= 15 ? "var(--color-expense)" : "var(--accent)",
                transition: "width 1s linear, background-color 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              backgroundColor: "var(--bg-card-alt)",
              color: "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--color-expense)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-alt)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>

          <button
            type="button"
            onClick={onExtend}
            style={{
              flex: 1.4,
              padding: "0.75rem 1.25rem",
              borderRadius: "var(--radius-lg)",
              border: "none",
              backgroundColor: "var(--accent)",
              color: "white",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "var(--shadow-accent)",
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <RefreshCw size={16} /> Mantener Sesión Activa
          </button>
        </div>
      </div>
    </div>
  );
}
