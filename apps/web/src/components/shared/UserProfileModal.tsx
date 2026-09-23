"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, User, Mail, Shield, Home, Calendar, Clock,
  LogOut, CheckCircle2, KeyRound, Globe, ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastContext";
import { useSafeBackdropClose } from "@/lib/useSafeBackdropClose";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    id?: string | null;
  } | null;
  onSignOut?: () => void;
  onOpenClerkProfile?: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  onSignOut,
  onOpenClerkProfile,
}: UserProfileModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const safeBackdrop = useSafeBackdropClose(onClose);
  const [household, setHousehold] = useState<{ name: string; currency: string; timezone: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/households")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.households && data.households.length > 0) {
            const current = data.households.find((h: any) => h.id === data.activeHouseholdId) || data.households[0];
            if (current) {
              setHousehold({
                name: current.name || "Mi Hogar",
                currency: current.defaultCurrency || "DOP",
                timezone: current.timezone || "America/Santo_Domingo",
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const displayName = user?.name || "Administrador del Hogar";
  const displayEmail = user?.email || "usuario@achouse.com";
  const initialLetter = (displayName.charAt(0) || "A").toUpperCase();

  const handleSignOutClick = () => {
    toast.info("Cerrando sesión de ACHouse...");
    onClose();
    if (onSignOut) {
      onSignOut();
    } else {
      document.cookie = "household_id=; path=/; max-age=0; SameSite=Lax";
      try {
        sessionStorage.clear();
        localStorage.removeItem("achouse_invite_token");
      } catch {}
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 300);
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
      {...safeBackdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 94vw)",
          maxHeight: "min(88vh, 720px)",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          margin: "auto",
          position: "relative",
          animation: "modalSpring 0.3s var(--ease-spring)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--bg-card)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Perfil de Usuario
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: 0 }}>
                Información de tu cuenta y sesión en ACHouse
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de perfil"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "0.35rem",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            overflowY: "auto",
            backgroundColor: "var(--bg-card)",
          }}
        >
          {/* User Hero Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.125rem",
              padding: "1.125rem",
              backgroundColor: "var(--bg-card-alt)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={displayName}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  objectFit: "cover",
                  boxShadow: "var(--shadow-md)",
                  border: "2px solid var(--accent)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  boxShadow: "var(--shadow-accent)",
                  flexShrink: 0,
                }}
              >
                {initialLetter}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  {displayName}
                </h3>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: 999,
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    background: "rgba(34, 197, 94, 0.12)",
                    color: "var(--color-income)",
                    border: "1px solid rgba(34, 197, 94, 0.25)",
                  }}
                >
                  <CheckCircle2 size={11} /> Sesión Activa
                </span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0.2rem 0 0.4rem 0" }} className="truncate">
                {displayEmail}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: "var(--accent)",
                    background: "var(--accent-subtle)",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  👑 Administrador
                </span>
                <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                  🇩🇴 República Dominicana
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div
              style={{
                padding: "0.875rem",
                backgroundColor: "var(--bg-card-alt)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-tertiary)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                <Home size={13} color="var(--accent)" /> Hogar Activo
              </div>
              <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0, color: "var(--text-primary)" }}>
                {household?.name || "Cargando..."}
              </p>
            </div>

            <div
              style={{
                padding: "0.875rem",
                backgroundColor: "var(--bg-card-alt)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-tertiary)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                <Globe size={13} color="var(--color-income)" /> Moneda Principal
              </div>
              <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0, color: "var(--text-primary)" }}>
                {household?.currency ? `${household.currency} (RD$)` : "DOP (RD$)"}
              </p>
            </div>

            <div
              style={{
                padding: "0.875rem",
                backgroundColor: "var(--bg-card-alt)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-tertiary)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                <Clock size={13} color="var(--color-warning)" /> Zona Horaria
              </div>
              <p style={{ fontWeight: 700, fontSize: "0.8125rem", margin: 0, color: "var(--text-primary)" }}>
                Santo Domingo (UTC-4)
              </p>
            </div>

            <div
              style={{
                padding: "0.875rem",
                backgroundColor: "var(--bg-card-alt)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-tertiary)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                <Shield size={13} color="var(--color-income)" /> Seguridad
              </div>
              <p style={{ fontWeight: 700, fontSize: "0.8125rem", margin: 0, color: "var(--color-income)" }}>
                Cifrado SSL / Clerk Auth
              </p>
            </div>
          </div>

          {/* Clerk Profile Action if available */}
          {onOpenClerkProfile && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenClerkProfile();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.8rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                backgroundColor: "var(--bg-card-alt)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-card-alt)";
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            >
              <KeyRound size={15} color="var(--accent)" />
              Gestionar credenciales, foto y seguridad en Clerk
              <ExternalLink size={13} style={{ opacity: 0.6 }} />
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--bg-card)",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              backgroundColor: "var(--bg-card-alt)",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-alt)")}
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleSignOutClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1.125rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "var(--color-expense)",
              color: "white",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <LogOut size={15} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
