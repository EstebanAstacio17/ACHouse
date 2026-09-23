"use client";

import { useState, useEffect } from "react";
import {
  Plus, UserCircle, Shield, Eye, Pencil, Trash2, X, Check,
  Mail, Briefcase, TrendingUp, DollarSign, UserCheck, AlertCircle, Building2,
  CheckCircle2, Copy, Clock, Share2, Loader2, Users, ExternalLink, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import {
  getMembers,
  updateMemberRole,
  inviteMember,
  removeMember,
  addMemberIncomeSource,
  deleteMemberIncomeSource,
} from "@/lib/actions/entities";
import { formatMoney } from "@/lib/geo";
import { useSafeBackdropClose } from "@/lib/useSafeBackdropClose";

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
  isPendingInvite?: boolean;
  inviteToken?: string;
  incomeSources: Array<{
    id?: string;
    name: string;
    type: "job" | "business" | "project";
    expectedMonthlyAmount: string;
    currency: string;
    actualIncome?: number;
    actualExpenses?: number;
    net?: number;
    transactionsCount?: number;
  }>;
  monthlyIncome: number;
  monthlyExpenses: number;
  netBalance: number;
}

const INITIAL_MEMBERS: MemberItem[] = [];

// ─── Invite Member Modal ────────────────────────────────────────────────────────
function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (email: string, role: "admin" | "contributor" | "viewer", name: string) => Promise<any>;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "contributor" | "viewer">("contributor");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl: string;
    token: string;
    emailSent: boolean;
    email: string;
    name: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      const res = await onInvite(email, role, name || email.split("@")[0]);
      if (res && res.inviteUrl) {
        setInviteResult({
          inviteUrl: res.inviteUrl,
          token: res.token,
          emailSent: Boolean(res.emailSent),
          email,
          name: name || email.split("@")[0],
        });
      } else {
        onClose();
      }
    } catch {
      // toast shown in onInvite
    } finally {
      setLoading(false);
    }
  };

  const activeUrl =
    typeof window !== "undefined" && window.location.origin && !window.location.origin.includes("localhost")
      ? `${window.location.origin}/invite/${inviteResult?.token || ""}`
      : inviteResult?.inviteUrl || (typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteResult?.token || ""}` : "");

  const handleCopyLink = () => {
    if (!activeUrl) return;
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const safeBackdrop = useSafeBackdropClose(onClose);

  if (inviteResult) {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `¡Hola ${inviteResult.name}! Te invito a unirte a nuestro hogar en ACHouse para gestionar juntos las finanzas. Haz clic aquí para entrar: ${activeUrl}`
    )}`;
    const mailtoUrl = `mailto:${inviteResult.email}?subject=${encodeURIComponent(
      "Invitación a nuestro hogar en ACHouse"
    )}&body=${encodeURIComponent(
      `¡Hola ${inviteResult.name}!\n\nTe invito a unirte a nuestro hogar en ACHouse para gestionar juntos las finanzas.\n\nAccede a través del siguiente enlace:\n${activeUrl}`
    )}`;

    return (
      <div
        className="overlay"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        {...safeBackdrop}
      >
        <div className="modal" style={{ width: "min(490px, 95vw)" }}>
          <div className="modal-header">
            <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle2 size={18} color="var(--color-income)" />
              ¡Invitación Lista para Compartir!
            </h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              <strong>{inviteResult.name}</strong> ha sido agregado al hogar y registrado exitosamente en el sistema.
            </p>

            {inviteResult.emailSent ? (
              <div style={{ background: "var(--color-income-dim)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "var(--radius-md)", padding: "0.75rem", fontSize: "0.8125rem", color: "var(--color-income)" }}>
                ✓ Se ha enviado una notificación automática a <strong>{inviteResult.email}</strong>.
              </div>
            ) : (
              <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "var(--radius-md)", padding: "0.75rem", fontSize: "0.8125rem", color: "var(--color-warning)" }}>
                ℹ️ Para entrega inmediata, comparte el enlace directo de acceso con el integrante:
              </div>
            )}

            <div className="form-group">
              <label className="label">Enlace de acceso directo</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="input"
                  readOnly
                  value={activeUrl}
                  style={{ fontSize: "0.8125rem", background: "var(--bg-card-alt)", cursor: "text" }}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  className={copied ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={handleCopyLink}
                  style={{ flexShrink: 0 }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: "none", fontSize: "0.8125rem", justifyContent: "center", gap: "0.375rem" }}
              >
                <Share2 size={14} color="#25D366" /> WhatsApp
              </a>
              <a
                href={mailtoUrl}
                className="btn btn-secondary"
                style={{ textDecoration: "none", fontSize: "0.8125rem", justifyContent: "center", gap: "0.375rem" }}
              >
                <Mail size={14} /> Enviar por Correo
              </a>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: "100%" }}>
              Listo / Finalizar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      {...safeBackdrop}
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
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <Mail size={15} /> Enviar Invitación
                </>
              )}
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
  member,
  allMembers = [],
}: {
  onClose: () => void;
  onAdd: (source: {
    name: string;
    type: "job" | "business" | "project";
    expectedMonthlyAmount: string;
    currency: string;
    memberIds: string[];
  }) => Promise<void>;
  member: MemberItem;
  allMembers?: MemberItem[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"job" | "business" | "project">("business");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("DOP");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([member.id]);
  const [loading, setLoading] = useState(false);

  const toggleMember = (mId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        type,
        expectedMonthlyAmount: amount || "0",
        currency,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : [member.id],
      });
      onClose();
    } catch {
      // toast shown in parent
    } finally {
      setLoading(false);
    }
  };

  const safeBackdrop = useSafeBackdropClose(onClose);

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      {...safeBackdrop}
    >
      <div className="modal" style={{ width: "min(500px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            Nueva Fuente de Ingreso / Negocio
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Nombre de la fuente o negocio *</label>
              <input
                className="input"
                required
                placeholder="Ej: Artesanías Ana, Salario Tech, Alquiler..."
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label">Tipo de actividad</label>
              <select className="input" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="business">🏢 Negocio propio / Emprendimiento</option>
                <option value="job">💼 Empleo / Salario fijo</option>
                <option value="project">📈 Inversión / Proyecto específico</option>
              </select>
            </div>

            {/* Integrantes Asignados */}
            <div className="form-group">
              <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Users size={14} /> Integrante(s) asignados a esta fuente *
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                  maxHeight: 140,
                  overflowY: "auto",
                  padding: "0.5rem",
                  background: "var(--bg-card-alt)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {allMembers.map(m => {
                  const isChecked = selectedMemberIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.375rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        background: isChecked ? "var(--accent-subtle)" : "transparent",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        transition: "background 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: "pointer" }}
                      />
                      <span style={{ fontWeight: 600 }}>{m.displayName}</span>
                      {m.id === member.id && (
                        <span style={{ fontSize: "0.6875rem", color: "var(--accent)", marginLeft: "auto" }}>
                          (Principal)
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", margin: 0 }}>
                Aparecerá en la sección de <strong>Negocios</strong> y generará automáticamente sus <strong>Categorías</strong> (ingreso y egreso).
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label"><DollarSign size={12} style={{ display: "inline" }} />Monto mensual estimado</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
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
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar y Sincronizar
            </button>
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

  const fetchMembers = async () => {
    try {
      const data = await getMembers();
      if (data) {
        setMembers(
          data.map((m: any) => ({
            id: m.id,
            displayName: m.displayName || "Miembro",
            role: (m.role as any) || "contributor",
            email: m.email || undefined,
            avatarUrl: m.avatarUrl || null,
            isActive: m.isActive ?? true,
            isPendingInvite: m.isPendingInvite ?? false,
            inviteToken: m.inviteToken || undefined,
            incomeSources: (m.incomeSources || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              type: s.type,
              expectedMonthlyAmount: String(s.expectedMonthlyAmount || "0"),
              currency: s.currency || "DOP",
              actualIncome: Number(s.actualIncome || 0),
              actualExpenses: Number(s.actualExpenses || 0),
              net: Number(s.net || 0),
              transactionsCount: Number(s.transactionsCount || 0),
            })),
            monthlyIncome: Number(m.monthlyIncome || 0),
            monthlyExpenses: Number(m.monthlyExpenses || 0),
            netBalance: Number(m.netBalance || 0),
          }))
        );
      }
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const fmt = (n: number | string, currency = "DOP") => formatMoney(n, currency);

  const totalHouseholdIncome = members.reduce((sum, m) => sum + m.monthlyIncome, 0);
  const totalHouseholdExpenses = members.reduce((sum, m) => sum + m.monthlyExpenses, 0);
  const totalHouseholdNet = totalHouseholdIncome - totalHouseholdExpenses;

  const handleInviteMember = async (email: string, role: "admin" | "contributor" | "viewer", name: string) => {
    try {
      const res = await inviteMember({ email, role, name });
      if (res.success && res.member) {
        await fetchMembers();
        if (res.emailSent) {
          toast.success(`Invitación enviada por correo a ${email}`);
        } else {
          toast.info(`Invitación registrada. Puedes compartir el enlace directo.`);
        }
        return res;
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al invitar integrante");
      throw err;
    }
  };

  const handleAddSource = async (source: {
    name: string;
    type: "job" | "business" | "project";
    expectedMonthlyAmount: string;
    currency: string;
    memberIds: string[];
  }) => {
    if (!activeMemberForSource) return;

    try {
      await addMemberIncomeSource({
        memberId: activeMemberForSource.id,
        name: source.name,
        type: source.type,
        expectedMonthlyAmount: source.expectedMonthlyAmount,
        currency: source.currency,
        memberIds: source.memberIds,
      });

      toast.success(`Fuente/Negocio "${source.name}" creado y sincronizado con categorías`);
      await fetchMembers();
    } catch (err: any) {
      toast.error(err?.message || "Error al registrar la fuente de ingreso");
      throw err;
    }
  };

  const handleCopyInviteLink = (token?: string) => {
    if (!token) return;
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("¡Enlace de invitación copiado al portapapeles!");
  };

  const handleDeleteMember = async (memberId: string) => {
    if (window.confirm("¿Seguro que deseas remover a este integrante del hogar?")) {
      try {
        await removeMember(memberId);
        setMembers(prev => prev.filter(m => m.id !== memberId));
        toast.info("Integrante removido del hogar");
      } catch (err: any) {
        toast.error(err?.message || "Error al remover integrante");
      }
    }
  };

  const handleDeleteSource = async (memberId: string, sourceId?: string) => {
    if (!sourceId) return;
    if (window.confirm("¿Seguro que deseas eliminar esta fuente de ingreso para este integrante?")) {
      try {
        await deleteMemberIncomeSource(sourceId, memberId);
        toast.info("Fuente de ingreso eliminada");
        await fetchMembers();
      } catch (err: any) {
        toast.error(err?.message || "Error al eliminar fuente de ingreso");
      }
    }
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
          member={activeMemberForSource}
          allMembers={members}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Integrantes del Hogar</h1>
            <p className="page-subtitle">Gestiona roles, fuentes de ingreso, negocios y aportes individuales</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
            <Plus size={16} /> Invitar Integrante
          </button>
        </div>

        {/* Global Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Total Integrantes</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--accent)" }}>{members.length}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Ingresos Combinados</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--color-income)" }}>{fmt(totalHouseholdIncome)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Egresos Combinados</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--color-expense)" }}>{fmt(totalHouseholdExpenses)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Balance Neto</p>
            <p style={{ fontSize: "1.625rem", fontWeight: 800, color: totalHouseholdNet >= 0 ? "var(--color-income)" : "var(--color-expense)" }}>
              {fmt(totalHouseholdNet)}
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
                <div key={member.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                  {/* Member Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
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
                        <p style={{ fontWeight: 700, fontSize: "1.0625rem", margin: 0 }}>{member.displayName}</p>
                        {member.email && <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.15rem 0" }}>{member.email}</p>}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
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
                            }}
                          >
                            <roleCfg.Icon size={12} /> {roleCfg.label}
                          </span>
                          {member.isPendingInvite && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "#d97706",
                                background: "rgba(245, 158, 11, 0.12)",
                                border: "1px solid rgba(245, 158, 11, 0.28)",
                                padding: "0.15rem 0.5rem",
                                borderRadius: 999,
                              }}
                              title="Invitación enviada pendiente de aceptación"
                            >
                              <Clock size={11} /> Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      {member.isPendingInvite && member.inviteToken && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "var(--accent)" }}
                          onClick={() => handleCopyInviteLink(member.inviteToken)}
                          title="Copiar enlace de invitación"
                        >
                          <Copy size={13} /> Copiar Enlace
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: "var(--color-expense)" }}
                        onClick={() => handleDeleteMember(member.id)}
                        title="Remover integrante"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Member Contribution KPIs */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    {[
                      { label: "Ingresos", value: fmt(member.monthlyIncome), color: "var(--color-income)" },
                      { label: "Egresos", value: fmt(member.monthlyExpenses), color: "var(--color-expense)" },
                      { label: "Balance", value: fmt(net), color: net >= 0 ? "var(--color-income)" : "var(--color-expense)" },
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
                        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: kpi.color, margin: 0 }}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Income Sources & Businesses List */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
                        Fuentes & Negocios ({member.incomeSources.length})
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
                          Sin fuentes o negocios asignados
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
                            <div style={{ flex: 1, overflow: "hidden" }}>
                              <p style={{ fontSize: "0.8125rem", fontWeight: 600, margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {src.name}
                              </p>
                              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                                <span>Estimado: {formatMoney(src.expectedMonthlyAmount, src.currency || "DOP")}</span>
                                {src.actualIncome !== undefined && src.actualIncome > 0 && (
                                  <span style={{ color: "var(--color-income)" }}>
                                    • Ing: {formatMoney(src.actualIncome, src.currency || "DOP")}
                                  </span>
                                )}
                                {src.actualExpenses !== undefined && src.actualExpenses > 0 && (
                                  <span style={{ color: "var(--color-expense)" }}>
                                    • Egr: {formatMoney(src.actualExpenses, src.currency || "DOP")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: "var(--text-tertiary)", width: 22, height: 22, padding: 0 }}
                              onClick={() => handleDeleteSource(member.id, src.id)}
                              title="Eliminar fuente"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick Shortcut Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <a
                      href={`/dashboard/transactions?member=${member.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", fontSize: "0.75rem" }}
                    >
                      <ExternalLink size={12} /> Movimientos
                    </a>
                    <a
                      href={`/dashboard/transactions?member=${member.id}&new=true`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", fontSize: "0.75rem" }}
                    >
                      <Plus size={12} /> + Transacción
                    </a>
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
