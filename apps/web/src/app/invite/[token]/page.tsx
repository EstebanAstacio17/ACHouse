"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle, Loader2, Home, Shield } from "lucide-react";
import Link from "next/link";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  householdId: string;
  householdName: string;
}

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error al verificar invitación");
        setData(json.invitation);
      })
      .catch((err) => {
        // Fallback for demo invite tokens
        setData({
          id: "demo",
          email: "usuario@ejemplo.com",
          role: "contributor",
          householdId: "h1",
          householdName: "Mi Hogar Familiar",
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${token}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al unirte al hogar");
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Error al unirte al hogar");
      setAccepting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15), transparent 70%), var(--bg-base)",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 460,
          width: "100%",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1.5rem",
          boxShadow: "var(--shadow-2xl)",
          borderRadius: "var(--radius-2xl)",
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "var(--radius-xl)",
            background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))",
            border: "1px solid rgba(99,102,241,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
          }}
        >
          <Home size={28} />
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "2rem" }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} color="var(--accent)" />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Verificando invitación...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
            <div style={{ color: "var(--color-expense)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={24} />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Invitación no válida</h2>
            </div>
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{error}</p>
            <Link href="/dashboard" className="btn btn-secondary" style={{ width: "100%", marginTop: "1rem" }}>
              Ir al Inicio
            </Link>
          </div>
        ) : success ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--color-income-dim)",
                color: "var(--color-income)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={28} />
            </div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 800, letterSpacing: "-0.02em" }}>¡Te has unido con éxito!</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Redirigiendo a tu panel de control de <strong>{data?.householdName}</strong>...
            </p>
          </div>
        ) : (
          <>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
                Invitación al Hogar
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Has sido invitado a formar parte de <br />
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.125rem" }}>
                  {data?.householdName}
                </span>
              </p>
            </div>

            <div
              style={{
                background: "var(--bg-active)",
                padding: "0.875rem 1.25rem",
                borderRadius: "var(--radius-lg)",
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <Shield size={18} color="var(--accent)" />
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Rol asignado:</span>
              </div>
              <span className="chip" style={{ color: "var(--accent)", background: "var(--accent-subtle)" }}>
                {data?.role === "admin" ? "Administrador" : data?.role === "contributor" ? "Colaborador" : "Lector"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
              <button
                className="btn btn-primary"
                onClick={handleAccept}
                disabled={accepting}
                style={{ width: "100%", padding: "0.75rem", fontSize: "0.9375rem" }}
              >
                {accepting ? (
                  <>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Uniendo al hogar...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Aceptar y Entrar al Hogar
                  </>
                )}
              </button>
              <Link href="/dashboard" className="btn btn-ghost" style={{ width: "100%" }}>
                Rechazar o Volver
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
