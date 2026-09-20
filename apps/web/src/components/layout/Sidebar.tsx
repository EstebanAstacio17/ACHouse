"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Users,
  Building2,
  FolderKanban,
  Landmark,
  Tag,
  BarChart3,
  Settings,
  ChevronRight,
  Home,
  LogOut,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastContext";

const navSections = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",              icon: LayoutDashboard, label: "Dashboard" },
      { href: "/dashboard/transactions", icon: ArrowLeftRight,  label: "Transacciones" },
      { href: "/dashboard/accounts",     icon: CreditCard,      label: "Cuentas" },
    ],
  },
  {
    label: "Organización",
    items: [
      { href: "/dashboard/members",      icon: Users,         label: "Integrantes" },
      { href: "/dashboard/businesses",   icon: Building2,     label: "Negocios" },
      { href: "/dashboard/projects",     icon: FolderKanban,  label: "Proyectos" },
      { href: "/dashboard/loans",        icon: Landmark,      label: "Préstamos" },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/dashboard/categories",   icon: Tag,      label: "Categorías" },
      { href: "/dashboard/reports",      icon: BarChart3, label: "Reportes" },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const handleSignOut = () => {
    toast.info("Cerrando sesión de ACHouse...");
    document.cookie = "household_id=; path=/; max-age=0; SameSite=Lax";
    if (onClose) onClose();
    setTimeout(() => {
      router.push("/sign-in");
      router.refresh();
    }, 350);
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? "active" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div className="sidebar-logo">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              flexShrink: 0,
              boxShadow: "var(--shadow-accent)",
            }}
          >
            🏠
          </div>
          <div>
            <p
              style={{
                fontWeight: 800,
                fontSize: "0.9375rem",
                color: "var(--text-primary)",
                lineHeight: 1.25,
                letterSpacing: "-0.025em",
              }}
            >
              ACHouse
            </p>
            <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", lineHeight: 1, marginTop: 1 }}>
              Finanzas Familiares
            </p>
          </div>
        </div>

        {/* ── Nav Sections ─────────────────────────────────────────── */}
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="nav-section-label">{section.label}</p>
              {section.items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`nav-item ${isActive ? "active" : ""}`}
                  >
                    <item.icon
                      size={16}
                      strokeWidth={isActive ? 2.25 : 1.75}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, letterSpacing: "-0.01em" }}>{item.label}</span>
                    {isActive && (
                      <ChevronRight size={12} strokeWidth={2.5} style={{ opacity: 0.4 }} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Bottom settings & Sign Out ────────────────────────────── */}
        <div
          style={{
            padding: "0.75rem 0.625rem",
            borderTop: "1px solid var(--border-hair)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className={`nav-item ${pathname.startsWith("/dashboard/settings") ? "active" : ""}`}
          >
            <Settings size={16} strokeWidth={pathname.startsWith("/dashboard/settings") ? 2.25 : 1.75} />
            <span style={{ flex: 1, letterSpacing: "-0.01em" }}>Configuración</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="nav-item"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              color: "var(--color-expense)",
            }}
            title="Cerrar Sesión"
          >
            <LogOut size={16} strokeWidth={2} />
            <span style={{ flex: 1, letterSpacing: "-0.01em", fontWeight: 600 }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
