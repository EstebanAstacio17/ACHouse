"use client";

import { useState, useEffect, useRef } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  Bell, Search, ChevronDown, Home, Moon, Sun,
  CreditCard, Calendar, CheckCircle2, X, Menu,
  Wallet, Users, FolderKanban, Tag, BarChart3,
  Settings, ArrowLeftRight, Building2, Landmark,
  CheckCheck, AlertCircle, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  householdName?: string;
  onToggleMobileMenu?: () => void;
}

const DEMO_NOTIFICATIONS: Array<{ id: string; title: string; message: string; time: string; type: "warning" | "info" | "success"; read: boolean }> = [];

const SEARCH_ITEMS = [
  { label: "Dashboard General",                href: "/dashboard",              category: "Navegación",    icon: Home },
  { label: "Ver Transacciones",                href: "/dashboard/transactions", category: "Finanzas",      icon: ArrowLeftRight },
  { label: "Cuentas y Tarjetas",               href: "/dashboard/accounts",     category: "Finanzas",      icon: CreditCard },
  { label: "Integrantes y Roles",              href: "/dashboard/members",      category: "Organización",  icon: Users },
  { label: "Negocios y P&L",                  href: "/dashboard/businesses",   category: "Negocios",      icon: Building2 },
  { label: "Proyectos con Presupuesto",        href: "/dashboard/projects",     category: "Proyectos",     icon: FolderKanban },
  { label: "Tarjetas y Préstamos",            href: "/dashboard/loans",        category: "Deudas",        icon: Landmark },
  { label: "Categorías",                       href: "/dashboard/categories",   category: "Configuración", icon: Tag },
  { label: "Reportes y Conciliación",         href: "/dashboard/reports",      category: "Reportes",      icon: BarChart3 },
  { label: "Ajustes del Hogar",               href: "/dashboard/settings",     category: "Configuración", icon: Settings },
];

const NOTIF_ICON: Record<string, React.ReactNode> = {
  warning: <AlertCircle size={14} strokeWidth={2} style={{ color: "var(--color-warning)" }} />,
  info:    <Calendar     size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />,
  success: <CheckCheck   size={14} strokeWidth={2} style={{ color: "var(--color-income)" }} />,
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export function Header({ householdName = "Mi Hogar", onToggleMobileMenu }: HeaderProps) {
  const router = useRouter();
  const [showSearch,       setShowSearch]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [showNotif,        setShowNotif]        = useState(false);
  const [notifications,    setNotifications]    = useState(DEMO_NOTIFICATIONS);
  const [theme,            setTheme]            = useState<"dark" | "light">("dark");
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef  = useRef<HTMLDivElement>(null);

  const [householdsList, setHouseholdsList] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [currentHouseholdName, setCurrentHouseholdName] = useState(householdName);
  const [showHouseholdMenu, setShowHouseholdMenu] = useState(false);
  const householdMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  /* ── Fetch user households ── */
  useEffect(() => {
    fetch("/api/households")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.households && data.households.length > 0) {
          setHouseholdsList(data.households);
          const active = data.households.find((h: any) => h.id === data.activeHouseholdId) || data.households[0];
          if (active) {
            setCurrentHouseholdName(active.name);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectHousehold = (h: { id: string; name: string }) => {
    document.cookie = `household_id=${h.id}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrentHouseholdName(h.name);
    setShowHouseholdMenu(false);
    router.refresh();
  };

  /* ── Close household dropdown on outside click ── */
  useEffect(() => {
    if (!showHouseholdMenu) return;
    const handler = (e: MouseEvent) => {
      if (householdMenuRef.current && !householdMenuRef.current.contains(e.target as Node)) {
        setShowHouseholdMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHouseholdMenu]);

  /* ── Theme sync & persistence ── */
  useEffect(() => {
    const applyTheme = () => {
      const saved = localStorage.getItem("achouse-theme") as "dark" | "light" | null;
      if (saved) {
        setTheme(saved);
        document.documentElement.classList.toggle("light", saved === "light");
      } else if (document.documentElement.classList.contains("light")) {
        setTheme("light");
      } else {
        setTheme("dark");
      }
    };

    applyTheme();
    window.addEventListener("achouse-theme-change", applyTheme);
    return () => window.removeEventListener("achouse-theme-change", applyTheme);
  }, []);

  /* ── ⌘K shortcut ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(s => !s);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowNotif(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── Auto-focus search on open ── */
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 80);
    else setSearchQuery("");
  }, [showSearch]);

  /* ── Close notification panel on outside click ── */
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif]);

  /* ── Theme toggle ── */
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("achouse-theme", next);
      document.documentElement.classList.toggle("light", next === "light");
      window.dispatchEvent(new Event("achouse-theme-change"));
    }
  };

  /* ── Search filter ── */
  const filteredItems = searchQuery.trim()
    ? SEARCH_ITEMS.filter(
        item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_ITEMS;

  /* ── Dismiss notification ── */
  const markRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <header className="header" id="app-header">
        {/* Mobile hamburger */}
        <button
          className="btn btn-ghost btn-icon"
          style={{ display: "none" }}
          id="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Menú"
        >
          <Menu size={18} />
        </button>

        {/* Household switcher */}
        <div style={{ position: "relative" }} ref={householdMenuRef}>
          <button
            className="household-switcher"
            id="household-switcher-btn"
            onClick={() => setShowHouseholdMenu((s) => !s)}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                flexShrink: 0,
              }}
            >
              🏠
            </div>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
              {currentHouseholdName}
            </span>
            <ChevronDown size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          </button>

          {showHouseholdMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                width: 230,
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-xl)",
                padding: "0.375rem",
                zIndex: 100,
              }}
            >
              <div style={{ padding: "0.375rem 0.625rem", fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                Mis Hogares
              </div>
              {householdsList.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleSelectHousehold(h)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    padding: "0.5rem 0.625rem",
                    background: h.name === currentHouseholdName ? "var(--bg-hover)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--text-primary)",
                    fontSize: "0.8125rem",
                    fontWeight: h.name === currentHouseholdName ? 700 : 500,
                  }}
                >
                  <Home size={14} color="var(--accent)" />
                  <span style={{ flex: 1 }} className="truncate">{h.name}</span>
                  {h.name === currentHouseholdName && <CheckCircle2 size={13} color="var(--color-income)" />}
                </button>
              ))}
              <div style={{ borderTop: "1px solid var(--border-hair)", margin: "0.25rem 0" }} />
              <Link
                href="/onboarding"
                onClick={() => setShowHouseholdMenu(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.625rem",
                  color: "var(--accent)",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  borderRadius: "var(--radius-md)",
                }}
              >
                + Crear otro hogar
              </Link>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search trigger */}
        <button
          className="btn btn-ghost"
          id="search-trigger-btn"
          onClick={() => setShowSearch(true)}
          style={{ gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-tertiary)", paddingLeft: "0.75rem", paddingRight: "0.75rem" }}
        >
          <Search size={15} strokeWidth={2} />
          <span style={{ display: "none" }} className="search-label">Buscar</span>
          <kbd style={{
            fontSize: "0.625rem",
            padding: "0.125rem 0.375rem",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-hover)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
            fontFamily: "inherit",
            letterSpacing: 0,
          }}>⌘K</kbd>
        </button>

        {/* Notification bell */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            className="btn btn-ghost btn-icon"
            id="notifications-btn"
            onClick={() => setShowNotif(s => !s)}
            aria-label="Notificaciones"
            style={{ position: "relative" }}
          >
            <Bell size={17} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--color-expense)",
                  border: "1.5px solid var(--bg-base)",
                  animation: unreadCount > 0 ? "pulseRing 2s ease-in-out infinite" : undefined,
                }}
              />
            )}
          </button>

          {/* Notification panel */}
          {showNotif && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: 340,
                background: "var(--glass-bg-light)",
                backdropFilter: "var(--glass-blur)",
                WebkitBackdropFilter: "var(--glass-blur)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-xl)",
                zIndex: 100,
                overflow: "hidden",
                animation: "modalSpring 0.36s var(--ease-spring)",
              }}
            >
              {/* Panel header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.125rem 0.75rem",
                borderBottom: "1px solid var(--border-hair)",
              }}>
                <span style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.02em" }}>
                  Notificaciones
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "0.75rem",
                      color: "var(--accent)",
                      cursor: "pointer",
                      fontWeight: 600,
                      padding: "0.25rem",
                    }}
                  >
                    Marcar todo leído
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                    <CheckCircle2 size={24} style={{ margin: "0 auto 0.5rem", opacity: 0.3 }} />
                    <p style={{ fontWeight: 600 }}>No hay notificaciones pendientes</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 2 }}>Todo está al día</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        width: "100%",
                        padding: "0.875rem 1.125rem",
                        background: n.read ? "transparent" : "var(--bg-hover)",
                        border: "none",
                        borderBottom: "1px solid var(--border-hair)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background var(--transition-fast)",
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "var(--bg-active)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {NOTIF_ICON[n.type]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          marginBottom: "0.125rem",
                        }}>
                          <span style={{
                            fontSize: "0.8125rem",
                            fontWeight: n.read ? 500 : 700,
                            color: "var(--text-primary)",
                            letterSpacing: "-0.01em",
                          }}>
                            {n.title}
                          </span>
                          {!n.read && (
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "var(--accent)",
                              flexShrink: 0,
                            }} />
                          )}
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "0.25rem", display: "block" }}>
                          {n.time}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "0.75rem 1.125rem", borderTop: "1px solid var(--border-hair)" }}>
                <button style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "center",
                }}>
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="btn btn-ghost btn-icon"
          id="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark"
            ? <Sun  size={16} strokeWidth={1.75} />
            : <Moon size={16} strokeWidth={1.75} />
          }
        </button>

        {/* User Avatar */}
        <UserAvatar />
      </header>

      {/* ── Command Palette / Search ────────────────────────────────────── */}
      {showSearch && (
        <div
          className="overlay"
          onClick={() => setShowSearch(false)}
          id="search-overlay"
          style={{ alignItems: "flex-start", paddingTop: "14vh" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(620px, calc(100vw - 2rem))",
              background: "var(--glass-bg-light)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-2xl)",
              boxShadow: "var(--shadow-2xl)",
              overflow: "hidden",
              animation: "modalSpring 0.36s var(--ease-spring)",
            }}
          >
            {/* Search input row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-hair)",
            }}>
              <Search size={18} strokeWidth={2} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar páginas, acciones…"
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  letterSpacing: "-0.01em",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex" }}
                >
                  <X size={16} />
                </button>
              )}
              <kbd style={{
                fontSize: "0.6875rem",
                padding: "0.2rem 0.5rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-hover)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-tertiary)",
                fontFamily: "inherit",
                flexShrink: 0,
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {filteredItems.length === 0 ? (
                <div style={{
                  padding: "2.5rem",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: "0.875rem",
                }}>
                  Sin resultados para &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: "0.5rem" }}>
                  {filteredItems.map((item, i) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setShowSearch(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.875rem",
                          padding: "0.625rem 0.875rem",
                          borderRadius: "var(--radius-lg)",
                          textDecoration: "none",
                          transition: "background var(--transition-fast)",
                          animation: `fadeInUp ${220 + i * 30}ms var(--ease-out) both`,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "var(--bg-active)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <item.icon size={15} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            letterSpacing: "-0.01em",
                          }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                            {item.category}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>↵</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: "0.625rem 1.25rem",
              borderTop: "1px solid var(--border-hair)",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}>
              <Sparkles size={13} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                Búsqueda global — <strong>⌘K</strong> para abrir/cerrar
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile CSS helper */}
      <style>{`
        @media (max-width: 1024px) {
          #mobile-menu-btn { display: flex !important; }
          .search-label { display: inline !important; }
        }
      `}</style>
    </>
  );
}
