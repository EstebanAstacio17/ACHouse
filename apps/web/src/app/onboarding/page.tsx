"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Home, Globe, Clock, ChevronRight, CheckCircle2, Loader2, Sparkles, MapPin } from "lucide-react";
import { COUNTRIES, CURRENCIES, TIMEZONES } from "@/lib/geo";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"choice" | "create" | "loading">("choice");
  const [form, setForm] = useState({
    name: "",
    country: "DO",
    currency: "DOP",
    timezone: "America/Santo_Domingo",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    // If user already has an active household, redirect to dashboard
    fetch("/api/households")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.households && data.households.length > 0) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleCountryChange = (countryCode: string) => {
    const selected = COUNTRIES.find((c) => c.code === countryCode);
    setForm((f) => ({
      ...f,
      country: countryCode,
      currency: selected ? selected.defaultCurrency : f.currency,
      timezone: selected ? selected.defaultTimezone : f.timezone,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre del hogar es obligatorio");
      return;
    }
    setStep("loading");

    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Error al crear el hogar");

      router.push("/dashboard");
      router.refresh();
    } catch {
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    }
  };

  if (step === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
          gap: "1.25rem",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--accent-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.0625rem", fontWeight: 600 }}>
          Configurando tu hogar...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 520, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 58,
              height: 58,
              borderRadius: "var(--radius-xl)",
              background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
              fontSize: "1.75rem",
              marginBottom: "1rem",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
            }}
          >
            🏠
          </div>
          <h1 className="hero-title-gradient" style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.375rem" }}>
            Bienvenido a ACHouse
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
            Configuremos tu espacio y las preferencias iniciales de tu hogar.
          </p>
        </div>

        {step === "choice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Create option */}
            <button
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                cursor: "pointer",
                textAlign: "left",
                border: "1.5px solid var(--border-default)",
                transition: "all var(--duration-fast) var(--ease-out)",
                background: "var(--bg-card)",
              }}
              onClick={() => setStep("create")}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--accent-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Home size={24} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem", color: "var(--text-primary)" }}>
                  Crear un nuevo hogar
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Empieza desde cero y configura tus cuentas, miembros y categorías iniciales.
                </p>
              </div>
              <ChevronRight size={18} color="var(--text-tertiary)" />
            </button>

            {/* Join option */}
            <div
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                cursor: "default",
                background: "var(--bg-card)",
                opacity: 0.85,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-active)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Globe size={24} color="var(--text-tertiary)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem", color: "var(--text-primary)" }}>
                  Unirme a un hogar existente
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Usa el enlace de invitación recibido por correo electrónico para unirte a tu familia.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "create" && (
          <div className="card">
            <h2 style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.01em", marginBottom: "1.25rem", color: "var(--text-primary)" }}>
              Configurar datos del hogar
            </h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              <div className="form-group">
                <label className="label" htmlFor="household-name">
                  Nombre del hogar *
                </label>
                <input
                  id="household-name"
                  className="input"
                  placeholder="Ej: Astacio Cuevas, Mi Casa..."
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              {/* Country Selection */}
              <div className="form-group">
                <label className="label" htmlFor="country">
                  <MapPin size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
                  País
                </label>
                <select
                  id="country"
                  className="input"
                  value={form.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Selection */}
              <div className="form-group">
                <label className="label" htmlFor="currency">
                  <Globe size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
                  Moneda predeterminada
                </label>
                <select
                  id="currency"
                  className="input"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag ? `${c.flag} ` : ""}{c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone Selection */}
              <div className="form-group">
                <label className="label" htmlFor="timezone">
                  <Clock size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
                  Zona horaria
                </label>
                <select
                  id="timezone"
                  className="input"
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p style={{ color: "var(--color-expense)", fontSize: "0.8125rem" }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep("choice")}
                >
                  ← Volver
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <CheckCircle2 size={16} /> Crear mi Hogar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
