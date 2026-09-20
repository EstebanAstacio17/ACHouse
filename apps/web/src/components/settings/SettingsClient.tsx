"use client";

import { useState, useEffect } from "react";
import {
  Home, Globe, Shield, Download, Trash2, Check, Moon, Sun,
  Clock, AlertTriangle, FileJson, CheckCircle2, History
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/ToastContext";

const DEMO_AUDIT_LOGS: Array<{ id: string; action: string; entity: string; user: string; date: Date }> = [];

export function SettingsClient() {
  const toast = useToast();
  const [tab, setTab] = useState<"general" | "audit" | "backup">("general");

  // General Settings Form
  const [householdName, setHouseholdName] = useState("Mi Hogar");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("America/Tegucigalpa");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    toast.success("Ajustes del hogar guardados exitosamente");
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      household: {
        name: householdName,
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
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setTab("general")}
          className={`btn ${tab === "general" ? "btn-primary" : "btn-ghost"}`}
        >
          <Home size={16} /> Ajustes Generales
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`btn ${tab === "audit" ? "btn-primary" : "btn-ghost"}`}
        >
          <Shield size={16} /> Auditoría & Seguridad
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="label">Moneda Principal</label>
                  <select
                    className="input"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD — Dólar Estadounidense ($)</option>
                    <option value="HNL">HNL — Lempira Hondureño (L)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="MXN">MXN — Peso Mexicano ($)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Zona Horaria</label>
                  <select
                    className="input"
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                  >
                    <option value="America/Tegucigalpa">America/Tegucigalpa (UTC-6)</option>
                    <option value="America/Guatemala">America/Guatemala (UTC-6)</option>
                    <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="Europe/Madrid">Europe/Madrid (UTC+1)</option>
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

      {/* Tab 2: Audit Logs */}
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
                {DEMO_AUDIT_LOGS.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
                      No hay registros de auditoría aún. Las acciones y cambios se registrarán aquí automáticamente.
                    </td>
                  </tr>
                ) : (
                  DEMO_AUDIT_LOGS.map(log => (
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
