"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Settings, LogOut, Shield, ChevronDown, CheckCircle2,
  ExternalLink, CreditCard, Sparkles, Home
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastContext";
import { UserProfileModal } from "./UserProfileModal";

const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const hasValidClerkKey =
  Boolean(pubKey) &&
  (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
  !pubKey.includes("REEMPLAZAR") &&
  pubKey.length > 20;

export function UserAvatar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontSize: "0.875rem",
          boxShadow: "var(--shadow-accent)",
        }}
      >
        A
      </div>
    );
  }

  if (hasValidClerkKey) {
    return <ClerkConnectedAvatar />;
  }

  return <CustomUserDropdown fallbackMode />;
}

/**
 * Connected to Clerk authentication
 */
function ClerkConnectedAvatar() {
  // Dynamically require Clerk hooks only when ClerkProvider is mounted
  const { useUser, useClerk } = require("@clerk/nextjs");
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const displayName = user?.fullName || user?.firstName || "Administrador";
  const displayEmail = user?.primaryEmailAddress?.emailAddress || "admin@achouse.com";
  const initial = (displayName.charAt(0) || "A").toUpperCase();
  const photoUrl = user?.imageUrl;

  const handleSignOut = async () => {
    try {
      toast.info("Cerrando sesión...");
      document.cookie = "household_id=; path=/; max-age=0; SameSite=Lax";
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      router.push("/sign-in");
    }
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          borderRadius: "50%",
        }}
        title="Perfil y opciones de sesión"
        aria-label="Abrir menú de usuario"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "var(--shadow-accent)",
              border: "2px solid var(--accent)",
            }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: "0.875rem",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            {initial}
          </div>
        )}
      </button>

      {/* User Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-2xl)",
            padding: "0.5rem",
            zIndex: 9999,
            animation: "modalSpring 0.25s var(--ease-spring)",
          }}
        >
          {/* User Header */}
          <div
            style={{
              padding: "0.75rem",
              borderBottom: "1px solid var(--border-subtle)",
              marginBottom: "0.35rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0, color: "var(--text-primary)" }} className="truncate">
                  {displayName}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: "0.1rem 0 0 0" }} className="truncate">
                  {displayEmail}
                </p>
              </div>
            </div>

            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: "var(--color-income)",
                  background: "rgba(34, 197, 94, 0.12)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: 999,
                }}
              >
                ● Activo en ACHouse
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                🇩🇴 RD
              </span>
            </div>
          </div>

          {/* Action Links */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowProfileModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <User size={16} color="var(--accent)" />
            <span style={{ flex: 1 }}>Ver Perfil del Usuario</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              openUserProfile();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Shield size={16} color="var(--color-income)" />
            <span style={{ flex: 1 }}>Seguridad y Cuenta</span>
            <ExternalLink size={12} style={{ opacity: 0.5 }} />
          </button>

          <Link
            href="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Settings size={16} color="var(--text-tertiary)" />
            <span>Configuración del Hogar</span>
          </Link>

          <div style={{ borderTop: "1px solid var(--border-hair)", margin: "0.35rem 0" }} />

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "var(--color-expense)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={{
          name: displayName,
          email: displayEmail,
          imageUrl: photoUrl,
          id: user?.id,
        }}
        onSignOut={handleSignOut}
        onOpenClerkProfile={() => openUserProfile()}
      />
    </div>
  );
}

/**
 * Fallback user dropdown for development or offline modes
 */
function CustomUserDropdown({ fallbackMode = false }: { fallbackMode?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSignOut = () => {
    toast.info("Cerrando sesión de ACHouse...");
    document.cookie = "household_id=; path=/; max-age=0; SameSite=Lax";
    setTimeout(() => {
      router.push("/sign-in");
      router.refresh();
    }, 400);
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 800,
          fontSize: "0.875rem",
          boxShadow: "var(--shadow-accent)",
          cursor: "pointer",
          border: "none",
        }}
        title="Perfil de Usuario y Cierre de Sesión"
        aria-label="Menú de usuario"
      >
        A
      </button>

      {/* User Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-2xl)",
            padding: "0.5rem",
            zIndex: 9999,
            animation: "modalSpring 0.25s var(--ease-spring)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.75rem",
              borderBottom: "1px solid var(--border-subtle)",
              marginBottom: "0.35rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "1rem",
                }}
              >
                A
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0, color: "var(--text-primary)" }}>
                  Administrador
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: "0.1rem 0 0 0" }} className="truncate">
                  admin@achouse.com
                </p>
              </div>
            </div>

            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: "var(--color-income)",
                  background: "rgba(34, 197, 94, 0.12)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: 999,
                }}
              >
                ● Administrador del Hogar
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                🇩🇴 RD
              </span>
            </div>
          </div>

          {/* Action Links */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowProfileModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <User size={16} color="var(--accent)" />
            <span style={{ flex: 1 }}>Ver Perfil del Usuario</span>
          </button>

          <Link
            href="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Settings size={16} color="var(--text-tertiary)" />
            <span>Configuración del Hogar</span>
          </Link>

          <Link
            href="/dashboard/accounts"
            onClick={() => setIsOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <CreditCard size={16} color="var(--text-tertiary)" />
            <span>Mis Cuentas y Tarjetas</span>
          </Link>

          <div style={{ borderTop: "1px solid var(--border-hair)", margin: "0.35rem 0" }} />

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "var(--color-expense)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={{
          name: "Administrador del Hogar",
          email: "admin@achouse.com",
        }}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
