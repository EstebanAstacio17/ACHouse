"use client";

import { useState, useEffect } from "react";
import {
  Home, Globe, Shield, Download, Trash2, Check, Moon, Sun,
  Clock, AlertTriangle, FileJson, CheckCircle2, History, MapPin,
  Lock, ShieldCheck, Timer, RefreshCw, LogOut, Laptop, BellRing
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/ToastContext";
import { COUNTRIES, CURRENCIES, TIMEZONES } from "@/lib/geo";
import { useSessionSecurity } from "@/components/shared/SessionSecurityProvider";

const INITIAL_AUDIT_LOGS: Array<{ id: string; action: string; entity: string; user: string; date: Date }> = [];

export function SettingsClient() {
  const toast = useToast();
  const [tab, setTab] = useState<"general" | "security" | "audit" | "backup">("general");
  
  // Session Security Context
  const {
    config: sessionConfig,
    updateConfig: updateSessionConfig,
    remainingSeconds,
    extendSession,
    lockSessionNow,
    sessionStartTime,
    lastActiveTime,
  } = useSessionSecurity();

  // General Settings Form
  const [householdName, setHouseholdName] = useState("Mi Hogar");
  const [country, setCountry] = useState("DO");
  const [currency, setCurrency] = useState("DOP");
  const [timezone, setTimezone] = useState("America/Santo_Domingo");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };



  useEffect(() => {
    fetch("/api/households")
      .then(res => res.json())
      .then(data => {
        if (data.households && data.households.length > 0) {
          const current = data.households.find((h: any) => h.id === data.activeHouseholdId) || data.households[0];
          if (current) {
            setHouseholdName(current.name || "Mi Hogar");
            if (current.country) setCountry(current.country);
            setCurrency(current.defaultCurrency || "DOP");
            setTimezone(current.timezone || "America/Santo_Domingo");
          }
        }
      })
      .catch(console.error);
  }, []);

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

  const toggleTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("achouse-theme", newTheme);
      document.documentElement.classList.toggle("light", newTheme === "light");
      window.dispatchEvent(new Event("achouse-theme-change"));
    }
    toast.info(`Tema cambiado a ${newTheme === "dark" ? "Modo Noche (Dark)" : "Modo Día (Light)"}`);
  };

  const handleCountryChange = (newCountryCode: string) => {
    setCountry(newCountryCode);
    const cInfo = COUNTRIES.find(c => c.code === newCountryCode);
    if (cInfo) {
      setCurrency(cInfo.defaultCurrency);
      setTimezone(cInfo.defaultTimezone);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/households", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: householdName,
          country,
          currency,
          timezone,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        toast.success("Ajustes del hogar guardados exitosamente");
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        toast.error("Error al guardar ajustes");
      }
    } catch {
      toast.error("Error de conexión al guardar");
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      household: {
        name: householdName,
        country,
        currency,
        timezone,
      },
      metadata: "ACHouse Complete Financial Backup",
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `achouse-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Copia de seguridad descargada exitosamente");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Configuración del Hogar</h1>
        <p className="page-subtitle">
          Administra la identidad del hogar, preferencias del sistema, auditoría y copias de seguridad.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setTab("general")}
          className={`btn ${tab === "general" ? "btn-primary" : "btn-ghost"}`}
        >
          <Home size={16} /> Ajustes Generales
        </button>
        <button
          onClick={() => setTab("security")}
          className={`btn ${tab === "security" ? "btn-primary" : "btn-ghost"}`}
        >
          <ShieldCheck size={16} /> Seguridad & Sesión
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`btn ${tab === "audit" ? "btn-primary" : "btn-ghost"}`}
        >
          <History size={16} /> Auditoría
        </button>
        <button
          onClick={() => setTab("backup")}
          className={`btn ${tab === "backup" ? "btn-primary" : "btn-ghost"}`}
        >
          <Download size={16} /> Copias de Seguridad
        </button>
      </div>

      {/* Tab 1: General Settings */}
      {tab === "general" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 650 }}>
          <div className="card">
            <form onSubmit={handleSaveGeneral} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="label">Nombre del Hogar</label>
                <input
                  className="input"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">
                  <MapPin size={14} style={{ display: "inline", marginRight: "0.35rem", verticalAlign: "middle", color: "var(--color-primary)" }} />
                  País de residencia
                </label>
                <select
                  className="input"
                  value={country}
                  onChange={e => handleCountryChange(e.target.value)}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="label">
                    <Globe size={14} style={{ display: "inline", marginRight: "0.35rem", verticalAlign: "middle" }} />
                    Moneda Principal
                  </label>
                  <select
                    className="input"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.flag ? `${curr.flag} ` : ""}{curr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">
                    <Clock size={14} style={{ display: "inline", marginRight: "0.35rem", verticalAlign: "middle" }} />
                    Zona Horaria
                  </label>
                  <select
                    className="input"
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="divider" />

              <div>
                <label className="label">Tema de la Interfaz</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => toggleTheme("dark")}
                    className={`btn ${theme === "dark" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    <Moon size={16} /> Modo Noche (Dark)
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTheme("light")}
                    className={`btn ${theme === "light" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    <Sun size={16} /> Modo Día (Light)
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}>
                <Check size={16} /> Guardar Cambios
              </button>

              {savedSuccess && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-income)", fontSize: "0.875rem" }}>
                  <CheckCircle2 size={16} /> Cambios guardados correctamente.
                </div>
              )}
            </form>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ borderColor: "var(--color-expense-dim)", background: "var(--color-expense-dim)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-expense)", marginBottom: "0.5rem" }}>
              <AlertTriangle size={18} />
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Zona de Peligro</h3>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Eliminar el hogar removerá permanentemente todas las transacciones, cuentas y registros asociados.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ color: "var(--color-expense)", borderColor: "var(--color-expense)" }}
              onClick={() => {
                if (window.confirm("¿Estás completamente seguro? Esta acción no se puede deshacer.")) {
                  alert("Hogar marcado para eliminación.");
                }
              }}
            >
              <Trash2 size={14} /> Eliminar este hogar
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Session Management */}
      {tab === "security" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720 }}>
          {/* Real-time Session Diagnostic Card */}
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, rgba(34, 197, 94, 0.05) 100%)",
              borderColor: "rgba(66, 133, 244, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    Estado de Seguridad de la Sesión
                  </h3>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
                    Monitoreo activo para la protección de tu información financiera
                  </p>
                </div>
              </div>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.75rem",
                  borderRadius: 999,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: "rgba(34, 197, 94, 0.12)",
                  color: "var(--color-income)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                <CheckCircle2 size={13} /> Sesión Protegida
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.75rem", marginTop: "0.5rem" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Timer size={13} color="var(--accent)" /> Tiempo Restante
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, fontFamily: "monospace", color: remainingSeconds <= 60 ? "var(--color-expense)" : "var(--accent)", marginTop: "0.2rem" }}>
                  {formatSeconds(remainingSeconds)}
                </div>
              </div>

              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Clock size={13} color="var(--color-income)" /> Última Actividad
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.35rem" }}>
                  {format(new Date(lastActiveTime), "HH:mm:ss", { locale: es })}
                </div>
              </div>

              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Laptop size={13} color="var(--color-warning)" /> Dispositivo
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.35rem" }}>
                  Navegador Actual (Activo)
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  extendSession();
                  toast.success("Temporizador de sesión reiniciado exitosamente");
                }}
              >
                <RefreshCw size={14} /> Renovar / Extender Tiempo
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ color: "var(--color-expense)", borderColor: "var(--color-expense-dim)" }}
                onClick={() => {
                  if (window.confirm("¿Deseas cerrar y bloquear tu sesión inmediatamente?")) {
                    lockSessionNow("manual");
                  }
                }}
              >
                <LogOut size={14} /> Bloquear / Cerrar Sesión Ahora
              </button>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                Temporizadores de Seguridad e Inactividad
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Ajusta los límites de tiempo para bloquear automáticamente el acceso a tus estados de cuenta.
              </p>
            </div>

            {/* 1. Inactivity Timeout Selector */}
            <div className="form-group">
              <label className="label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  <Timer size={14} style={{ display: "inline", marginRight: "0.35rem", verticalAlign: "middle", color: "var(--accent)" }} />
                  Cierre por inactividad tras:
                </span>
                <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: "0.8125rem" }}>
                  {sessionConfig.inactivityTimeoutMinutes} minutos
                </span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem", marginTop: "0.35rem" }}>
                {[
                  { label: "5 min", val: 5 },
                  { label: "10 min", val: 10 },
                  { label: "15 min (Recomendado)", val: 15 },
                  { label: "30 min", val: 30 },
                  { label: "60 min (1 hora)", val: 60 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => {
                      updateSessionConfig({ inactivityTimeoutMinutes: opt.val });
                      toast.success(`Tiempo de inactividad establecido en ${opt.val} minutos`);
                    }}
                    style={{
                      padding: "0.625rem 0.5rem",
                      borderRadius: "var(--radius-md)",
                      border: sessionConfig.inactivityTimeoutMinutes === opt.val
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border-default)",
                      backgroundColor: sessionConfig.inactivityTimeoutMinutes === opt.val
                        ? "var(--accent-subtle)"
                        : "var(--bg-card-alt)",
                      color: sessionConfig.inactivityTimeoutMinutes === opt.val
                        ? "var(--accent)"
                        : "var(--text-primary)",
                      fontWeight: sessionConfig.inactivityTimeoutMinutes === opt.val ? 700 : 500,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.35rem" }}>
                Si no se detecta movimiento de mouse, teclado o interacción en este lapso, la sesión se cerrará automáticamente.
              </p>
            </div>

            <div className="divider" />

            {/* 2. Close on Browser Exit / Restart switch */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }} htmlFor="closeOnExitToggle">
                  <Lock size={15} color="var(--color-income)" />
                  Exigir inicio de sesión al cerrar el navegador o reiniciar ordenador
                </label>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0", lineHeight: 1.45 }}>
                  Garantiza que nadie que acceda a tu ordenador tras reiniciarlo o reabrir el navegador pueda ver tus datos financieros sin antes autenticarse.
                </p>
              </div>
              <input
                id="closeOnExitToggle"
                type="checkbox"
                checked={sessionConfig.closeOnBrowserExit}
                onChange={(e) => {
                  updateSessionConfig({ closeOnBrowserExit: e.target.checked });
                  toast.info(e.target.checked ? "Protección de cierre de navegador ACTIVADA" : "Protección de cierre de navegador desactivada");
                }}
                style={{
                  width: 20,
                  height: 20,
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                  marginTop: 2,
                }}
              />
            </div>

            <div className="divider" />

            {/* 3. Warning Modal Countdown switch */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }} htmlFor="showWarningToggle">
                  <BellRing size={15} color="var(--color-warning)" />
                  Mostrar ventana de advertencia con cuenta regresiva (60 segundos)
                </label>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0", lineHeight: 1.45 }}>
                  Muestra una alerta visual 60 segundos antes del vencimiento para permitirte extender la sesión con un solo clic.
                </p>
              </div>
              <input
                id="showWarningToggle"
                type="checkbox"
                checked={sessionConfig.showWarningModal}
                onChange={(e) => {
                  updateSessionConfig({ showWarningModal: e.target.checked });
                  toast.info(e.target.checked ? "Aviso previo de inactividad ACTIVADO" : "Aviso previo de inactividad desactivado");
                }}
                style={{
                  width: 20,
                  height: 20,
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                  marginTop: 2,
                }}
              />
            </div>

            <div className="divider" />

            {/* 4. Maximum Continuous Lifetime */}
            <div className="form-group">
              <label className="label">
                <Clock size={14} style={{ display: "inline", marginRight: "0.35rem", verticalAlign: "middle" }} />
                Duración máxima de sesión continua ininterrumpida
              </label>
              <select
                className="input"
                value={sessionConfig.maxSessionHours}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateSessionConfig({ maxSessionHours: val });
                  toast.success(`Límite máximo de sesión continua actualizado a ${val === 0 ? "Sin límite" : `${val} horas`}`);
                }}
              >
                <option value={4}>4 Horas</option>
                <option value={8}>8 Horas</option>
                <option value={12}>12 Horas (Recomendado)</option>
                <option value={24}>24 Horas</option>
                <option value={0}>Sin límite continuo (solo inactividad)</option>
              </select>
              <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                Incluso con actividad constante, el sistema solicitará renovación de credenciales tras este periodo.
              </p>
            </div>
          </div>

          {/* Educational Security Note */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-xl)",
              backgroundColor: "rgba(66, 133, 244, 0.06)",
              border: "1px solid rgba(66, 133, 244, 0.18)",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.875rem",
            }}
          >
            <Shield size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "0.2rem" }}>
                Seguridad Financiera y Sincronización Multi-Pestaña
              </strong>
              Los controles de tiempo de ACHouse sincronizan todas las pestañas de tu navegador en tiempo real. Cuando extiendes o cierras tu sesión en una ventana, todas las demás se actualizan instantáneamente.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {tab === "audit" && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Historial de Acciones y Seguridad</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Registro inmutable de todas las modificaciones realizadas por los integrantes.
            </p>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Elemento / Detalle</th>
                  <th>Usuario</th>
                  <th>Fecha y Hora</th>
                </tr>
              </thead>
              <tbody>
                {INITIAL_AUDIT_LOGS.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
                      No hay registros de auditoría aún. Las acciones y cambios se registrarán aquí automáticamente.
                    </td>
                  </tr>
                ) : (
                  INITIAL_AUDIT_LOGS.map(log => (
                    <tr key={log.id}>
                      <td>
                        <span className="badge badge-reconciled">
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: "0.875rem" }}>{log.entity}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{log.user}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        {format(log.date, "dd MMM yyyy, HH:mm", { locale: es })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Backup */}
      {tab === "backup" && (
        <div className="card" style={{ maxWidth: 650, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--color-income-dim)", color: "var(--color-income)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileJson size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>Exportar Copia de Seguridad Completa</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Descarga un archivo JSON estructurado con todos los datos financieros de tu hogar.
              </p>
            </div>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Esta copia incluye todas las cuentas, transacciones históricas, categorías, integrantes y proyectos registrados en la plataforma.
          </p>
          <button className="btn btn-primary" onClick={handleExportBackup} style={{ alignSelf: "flex-start" }}>
            <Download size={16} /> Descargar Archivo de Respaldo (.json)
          </button>
        </div>
      )}
    </div>
  );
}
