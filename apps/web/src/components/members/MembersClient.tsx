"use client";

import { useState, useEffect } from "react";
import {
  Plus, UserCircle, Shield, Eye, Pencil, Trash2, X, Check,
  Mail, Briefcase, TrendingUp, DollarSign, UserCheck, AlertCircle, Building2
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { getMembers, updateMemberRole } from "@/lib/actions/entities";

const ROLE_CONFIG = {
  admin: { label: "Administrador", color: "var(--accent)", Icon: Shield, bg: "var(--accent-subtle)" },
  contributor: { label: "Colaborador", color: "var(--color-income)", Icon: UserCircle, bg: "var(--color-income-dim)" },
  viewer: { label: "Lector", color: "var(--text-secondary)", Icon: Eye, bg: "var(--bg-hover)" },
};

export interface MemberItem {
  id: string;
  displayName: string;
  role: "admin" | "contributor" | "viewer";
  email?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  incomeSources: Array<{
    id?: string;
    name: string;
    type: "job" | "business" | "project";
    expectedMonthlyAmount: string;
    currency: string;
  }>;
  monthlyIncome: number;
  monthlyExpenses: number;
}

const INITIAL_MEMBERS: MemberItem[] = [];

// ─── Invite Member Modal ────────────────────────────────────────────────────────
function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (email: string, role: "admin" | "contributor" | "viewer", name: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "contributor" | "viewer">("contributor");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onInvite(email, role, name || email.split("@")[0]);
    onClose();
  };

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: "min(480px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Invitar Integrante</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Nombre completo</label>
              <input
                className="input"
                placeholder="Ej: María Pérez"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label"><Mail size={12} style={{ display: "inline", marginRight: 4 }} />Correo electrónico *</label>
              <input
                className="input"
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Rol en el hogar</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setRole(key as any)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                      border: `1.5px solid ${role === key ? cfg.color : "var(--border-default)"}`,
                      background: role === key ? cfg.bg : "transparent",
                      color: role === key ? cfg.color : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <cfg.Icon size={16} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{cfg.label}</p>
                      <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                        {key === "admin"
                          ? "Control total del hogar y finanzas"
                          : key === "contributor"
                          ? "Puede registrar ingresos, gastos y cuentas"
                          : "Solo lectura y visualización de reportes"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Mail size={15} /> Enviar Invitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Income Source Modal ───────────────────────────────────────────────────
function IncomeSourceModal({
  onClose,
  onAdd,
  memberName,
}: {
  onClose: () => void;
  onAdd: (source: { name: string; type: "job" | "business" | "project"; expectedMonthlyAmount: string; currency: string }) => void;
  memberName: string;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"job" | "business" | "project">("job");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("DOP");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    onAdd({ name, type, expectedMonthlyAmount: amount, currency });
    onClose();
  };

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: "min(460px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            Nueva Fuente de Ingreso para {memberName}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Nombre de la fuente *</label>
              <input
                className="input"
                required
                placeholder="Ej: Salario Empresa X, Alquiler local..."
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Tipo de ingreso</label>
              <select className="input" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="job">💼 Empleo / Nómina</option>
                <option value="business">🏢 Negocio propio</option>
                <option value="project">📈 Inversión / Proyecto</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label"><DollarSign size={12} style={{ display: "inline" }} />Monto mensual estimado *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Moneda</label>
                <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="DOP">DOP (RD$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="HNL">HNL (L)</option>
                  <option value="COP">COP ($)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Check size={15} /> Guardar Fuente</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function MembersClient() {
  const toast = useToast();
  const [members, setMembers] = useState<MemberItem[]>(INITIAL_MEMBERS);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeMemberForSource, setActiveMemberForSource] = useState<MemberItem | null>(null);

  useEffect(() => {
    let active = true;
    getMembers()
      .then((data) => {
        if (active && data) {
          setMembers(
            data.map((m: any) => ({
              id: m.id,
              displayName: m.displayName || "Miembro",
              role: (m.role as any) || "admin",
              email: m.email || undefined,
              avatarUrl: m.avatarUrl || null,
              isActive: m.isActive ?? true,
              incomeSources: (m.incomeSources || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                type: s.type,
                expectedMonthlyAmount: String(s.expectedMonthlyAmount || "0"),
                currency: s.currency || "USD",
              })),
              monthlyIncome: 0,
              monthlyExpenses: 0,
            }))
          );
        }
      })
      .catch((err) => console.error("Error loading members:", err));
    return () => {
      active = false;
    };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const totalHouseholdIncome = members.reduce((sum, m) => sum + m.monthlyIncome, 0);
  const totalHouseholdExpenses = members.reduce((sum, m) => sum + m.monthlyExpenses, 0);

  const handleInviteMember = (email: string, role: "admin" | "contributor" | "viewer", name: string) => {
    const newMember: MemberItem = {
      id: String(Date.now()),
      displayName: name,
      email,
      role,
      avatarUrl: null,
      isActive: true,
      incomeSources: [],
      monthlyIncome: 0,
      monthlyExpenses: 0,
    };
    setMembers(prev => [...prev, newMember]);
    toast.success(`Invitación enviada exitosamente a ${email}`);
  };

  const handleAddSource = (source: { name: string; type: "job" | "business" | "project"; expectedMonthlyAmount: string; currency: string }) => {
    if (!activeMemberForSource) return;

    setMembers(prev =>
      prev.map(m => {
        if (m.id === activeMemberForSource.id) {
          const addedAmount = parseFloat(source.expectedMonthlyAmount);
          return {
            ...m,
            incomeSources: [...m.incomeSources, { id: String(Date.now()), ...source }],
            monthlyIncome: m.monthlyIncome + (isNaN(addedAmount) ? 0 : addedAmount),
          };
        }
        return m;
      })
    );
    toast.success(`Fuente "${source.name}" añadida`);
  };

  const handleDeleteMember = (memberId: string) => {
    if (window.confirm("¿Seguro que deseas remover a este integrante del hogar?")) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.info("Integrante removido del hogar");
    }
  };

  const handleDeleteSource = (memberId: string, sourceIndex: number) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id === memberId) {
          const removed = m.incomeSources[sourceIndex];
          const remAmount = parseFloat(removed.expectedMonthlyAmount);
          const updatedSources = m.incomeSources.filter((_, i) => i !== sourceIndex);
          return {
            ...m,
            incomeSources: updatedSources,
            monthlyIncome: Math.max(0, m.monthlyIncome - (isNaN(remAmount) ? 0 : remAmount)),
          };
        }
        return m;
      })
    );
    toast.info("Fuente de ingreso eliminada");
  };

  return (
    <>
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteMember}
        />
      )}

      {activeMemberForSource && (
        <IncomeSourceModal
          onClose={() => setActiveMemberForSource(null)}
          onAdd={handleAddSource}
          memberName={activeMemberForSource.displayName}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Integrantes del Hogar</h1>
            <p className="page-subtitle">Gestiona roles, fuentes de ingreso y aportes individuales</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
            <Plus size={16} /> Invitar Integrante
          </button>
        </div>

        {/* Global Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Total Integrantes</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--accent)" }}>{members.length}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Ingresos Combinados</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--color-income)" }}>{fmt(totalHouseholdIncome)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Flujo Neto Combinado</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 800, color: (totalHouseholdIncome - totalHouseholdExpenses) >= 0 ? "var(--color-income)" : "var(--color-expense)" }}>
              {fmt(totalHouseholdIncome - totalHouseholdExpenses)}
            </p>
          </div>
        </div>

        {/* Members Cards Grid or Empty State */}
        {members.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">👥</div>
            <p className="empty-state-title">No hay integrantes registrados</p>
            <p className="empty-state-desc">Invita o registra a los miembros de tu familia para colaborar en la gestión financiera del hogar.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>
              <Plus size={14} /> Invitar Primer Integrante
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
            {members.map(member => {
            const roleCfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.contributor;
            const net = member.monthlyIncome - member.monthlyExpenses;

            return (
              <div key={member.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Member Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        background: roleCfg.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.125rem",
                        fontWeight: 700,
                        color: "white",
                        flexShrink: 0,
                        boxShadow: "0 4px 12px var(--shadow-sm)",
                      }}
                    >
                      {member.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "1.0625rem" }}>{member.displayName}</p>
                      {member.email && <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{member.email}</p>}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: roleCfg.color,
                          background: roleCfg.bg,
                          padding: "0.15rem 0.5rem",
                          borderRadius: 999,
                          marginTop: "0.25rem",
                        }}
                      >
                        <roleCfg.Icon size={12} /> {roleCfg.label}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: "var(--color-expense)" }}
                    onClick={() => handleDeleteMember(member.id)}
                    title="Remover integrante"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Member Contribution KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  {[
                    { label: "Ingresos", value: fmt(member.monthlyIncome), color: "var(--color-income)" },
                    { label: "Gastos", value: fmt(member.monthlyExpenses), color: "var(--color-expense)" },
                    { label: "Aporte Neto", value: fmt(net), color: net >= 0 ? "var(--color-income)" : "var(--color-expense)" },
                  ].map(kpi => (
                    <div
                      key={kpi.label}
                      style={{
                        padding: "0.625rem 0.5rem",
                        background: "var(--bg-card-alt)",
                        borderRadius: "var(--radius-md)",
                        textAlign: "center",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <p style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginBottom: 2 }}>{kpi.label}</p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Income Sources List */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                      Fuentes de Ingreso ({member.incomeSources.length})
                    </p>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                      onClick={() => setActiveMemberForSource(member)}
                    >
                      <Plus size={13} /> Añadir
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {member.incomeSources.length === 0 ? (
                      <div style={{ padding: "0.75rem", background: "var(--bg-hover)", borderRadius: "var(--radius-md)", textAlign: "center", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        Sin fuentes registradas
                      </div>
                    ) : (
                      member.incomeSources.map((src, i) => (
                        <div
                          key={src.id || i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.625rem",
                            padding: "0.5rem 0.75rem",
                            background: "var(--bg-card-alt)",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {src.type === "job" ? (
                            <Briefcase size={14} color="var(--accent)" />
                          ) : src.type === "business" ? (
                            <Building2 size={14} color="var(--color-investment)" />
                          ) : (
                            <TrendingUp size={14} color="var(--color-income)" />
                          )}
                          <span style={{ fontSize: "0.8125rem", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {src.name}
                          </span>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-income)" }}>
                            {parseFloat(src.expectedMonthlyAmount).toLocaleString("en-US", { style: "currency", currency: src.currency || "USD" })}
                          </span>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: "var(--text-tertiary)", width: 22, height: 22, padding: 0 }}
                            onClick={() => handleDeleteSource(member.id, i)}
                            title="Eliminar fuente"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </>
  );
}
