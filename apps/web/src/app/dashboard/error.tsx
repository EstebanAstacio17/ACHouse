"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "2.5rem 2rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          border: "1px solid var(--border-default)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-expense)",
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Ha ocurrido un problema al cargar esta sección
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            No te preocupes, tus datos financieros están completamente seguros. Puedes intentar recargar la vista o volver al inicio.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
          <Link
            href="/dashboard"
            className="btn btn-secondary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            <Home size={15} /> Inicio
          </Link>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
