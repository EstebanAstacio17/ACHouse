"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
}

export function ThemeToggle({ className, style, showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncTheme = () => {
      const saved = localStorage.getItem("achouse-theme") as "dark" | "light" | null;
      if (saved) {
        setTheme(saved);
        document.documentElement.classList.toggle("light", saved === "light");
        document.documentElement.setAttribute("data-theme", saved);
      } else if (document.documentElement.classList.contains("light")) {
        setTheme("light");
      } else {
        setTheme("dark");
      }
    };

    syncTheme();
    window.addEventListener("achouse-theme-change", syncTheme);
    return () => window.removeEventListener("achouse-theme-change", syncTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("achouse-theme", next);
      document.documentElement.classList.toggle("light", next === "light");
      document.documentElement.setAttribute("data-theme", next);
      window.dispatchEvent(new Event("achouse-theme-change"));
    }
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className={className || "btn btn-ghost btn-icon"}
        style={{
          width: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-md)",
          ...style,
        }}
        aria-label="Cambiando tema"
        disabled
      >
        <span style={{ width: 16, height: 16 }} />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      id="theme-toggle-btn"
      className={className || "btn btn-ghost btn-icon"}
      onClick={toggleTheme}
      title={isDark ? "Cambiar a Modo Día" : "Cambiar a Modo Noche"}
      aria-label={isDark ? "Cambiar a Modo Día" : "Cambiar a Modo Noche"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        cursor: "pointer",
        transition: "all var(--duration-fast) var(--ease-out)",
        ...style,
      }}
    >
      {isDark ? (
        <Sun size={17} strokeWidth={2} style={{ color: "#fbbf24" }} />
      ) : (
        <Moon size={17} strokeWidth={2} style={{ color: "#6366f1" }} />
      )}
      {showLabel && (
        <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
          {isDark ? "Modo Día" : "Modo Noche"}
        </span>
      )}
    </button>
  );
}
