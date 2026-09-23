"use client";

import { useState, useEffect } from "react";
import {
  Plus, Building2, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2,
  X, Check, ExternalLink, ArrowUpCircle, ArrowDownCircle, Percent, Users, User
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { getBusinesses, createBusiness, updateBusiness, deleteBusiness } from "@/lib/actions/businesses-projects-loans";
import { getMembers } from "@/lib/actions/entities";
import { formatMoney } from "@/lib/geo";
import { useSafeBackdropClose } from "@/lib/useSafeBackdropClose";

export interface BusinessItem {
  id: string;
  name: string;
  description: string;
  type: string;
  currency: string;
  income: number;
  expenses: number;
  transactions: number;
  isActive: boolean;
  monthlyData: Array<{ month: string; income: number; expenses: number }>;
  members?: Array<{ id: string; displayName: string; role: string; avatarUrl?: string | null }>;
  memberIds?: string[];
}

export interface MemberOption {
  id: string;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
}

const INITIAL_BUSINESSES: BusinessItem[] = [];

function BusinessModal({
  onClose,
  onSave,
  initialData,
  availableMembers = [],
}: {
  onClose: () => void;
  onSave: (biz: Partial<BusinessItem>) => void;
  initialData?: BusinessItem | null;
  availableMembers?: MemberOption[];
}) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    type: initialData?.type ?? "Comercio",
    currency: initialData?.currency ?? "DOP",
  });

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (initialData?.memberIds && initialData.memberIds.length > 0) {
      return initialData.memberIds;
    }
    return availableMembers.length > 0 ? [availableMembers[0].id] : [];
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      id: initialData?.id,
      name: form.name.trim(),
      description: form.description,
      type: form.type,
      currency: form.currency,
      memberIds: selectedMemberIds,
    });
    onClose();
  };

  const toggleMember = (mId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    );
  };

  const safeBackdrop = useSafeBackdropClose(onClose);

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      {...safeBackdrop}
    >
      <div className="modal" style={{ width: "min(520px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {initialData ? "Editar Negocio" : "Nuevo Negocio"}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Nombre del negocio *</label>
              <input
                className="input"
                required
                placeholder="Ej: Artesanías Ana, Tienda Virtual..."
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label">Descripción</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Breve descripción del negocio o actividad..."
                value={form.description}
                onChange={e => set("description", e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Integrantes Asignados */}
            <div className="form-group">
              <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Users size={14} /> Integrantes responsables / asociados *
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                  maxHeight: 160,
                  overflowY: "auto",
                  padding: "0.5rem",
                  background: "var(--bg-card-alt)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {availableMembers.length === 0 ? (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.25rem 0" }}>
                    No hay otros integrantes registrados en el hogar.
                  </p>
                ) : (
                  availableMembers.map(m => {
                    const isChecked = selectedMemberIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.625rem",
                          padding: "0.4rem 0.5rem",
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
                          onChange={() => {}} // handled by label onClick
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.displayName}</span>
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                          {m.role === "admin" ? "Administrador" : m.role === "contributor" ? "Colaborador" : "Lector"}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", margin: 0 }}>
                Las fuentes de ingreso y categorías se sincronizarán para los integrantes seleccionados.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label">Tipo de actividad</label>
                <select className="input" value={form.type} onChange={e => set("type", e.target.value)}>
                  <option value="Comercio">Comercio / Ventas</option>
                  <option value="Servicios">Servicios Profesionales</option>
                  <option value="Manufactura">Manufactura / Producción</option>
                  <option value="Agricultura">Agricultura / Ganadería</option>
                  <option value="Tecnología">Tecnología / Digital</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Moneda</label>
                <select className="input" value={form.currency} onChange={e => set("currency", e.target.value)}>
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
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> {initialData ? "Actualizar" : "Crear Negocio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BusinessesClient() {
  const toast = useToast();
  const [businesses, setBusinesses] = useState<BusinessItem[]>(INITIAL_BUSINESSES);
  const [availableMembers, setAvailableMembers] = useState<MemberOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<BusinessItem | null>(null);

  const fetchData = async () => {
    try {
      const [bizData, membersData] = await Promise.all([
        getBusinesses(),
        getMembers(),
      ]);

      if (bizData) {
        setBusinesses(
          bizData.map((b: any) => ({
            id: b.id,
            name: b.name,
            description: b.description || "",
            type: b.type || "Comercio",
            currency: b.currency || "DOP",
            income: Number(b.income || 0),
            expenses: Number(b.expenses || 0),
            transactions: Number(b.transactions || 0),
            isActive: b.isActive ?? true,
            monthlyData: b.monthlyData || [],
            members: b.members || [],
            memberIds: b.memberIds || [],
          }))
        );
      }

      if (membersData) {
        setAvailableMembers(
          membersData.map((m: any) => ({
            id: m.id,
            displayName: m.displayName || "Miembro",
            role: m.role || "contributor",
            avatarUrl: m.avatarUrl || null,
          }))
        );
      }
    } catch (err) {
      console.error("Error loading businesses data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fmt = (n: number | string, currency = "DOP") => {
    return formatMoney(n, currency);
  };

  const totalRevenue = businesses.reduce((sum, b) => sum + b.income, 0);
  const totalExpenses = businesses.reduce((sum, b) => sum + b.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const handleSave = async (saved: Partial<BusinessItem>) => {
    try {
      if (saved.id) {
        await updateBusiness(saved.id, {
          name: saved.name,
          description: saved.description,
          type: saved.type,
          currency: saved.currency,
          memberIds: saved.memberIds,
        });
        toast.success("Negocio actualizado exitosamente");
      } else {
        await createBusiness({
          name: saved.name!,
          description: saved.description,
          type: saved.type,
          currency: saved.currency,
          memberIds: saved.memberIds,
        });
        toast.success("Negocio registrado exitosamente");
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar negocio");
    }
    setEditingBiz(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el negocio "${name}"?`)) {
      try {
        await deleteBusiness(id);
        setBusinesses(prev => prev.filter(b => b.id !== id));
        toast.info(`Negocio "${name}" eliminado`);
      } catch (err: any) {
        toast.error(err?.message || "Error al eliminar el negocio");
      }
    }
  };

  return (
    <>
      {showModal && (
        <BusinessModal
          onClose={() => { setShowModal(false); setEditingBiz(null); }}
          onSave={handleSave}
          initialData={editingBiz}
          availableMembers={availableMembers}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Negocios y Emprendimientos</h1>
            <p className="page-subtitle">Estado de resultados (P&L), ingresos y márgenes de ganancia por integrante y negocio</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingBiz(null); setShowModal(true); }}
          >
            <Plus size={16} /> Nuevo Negocio
          </button>
        </div>

        {/* Global P&L KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Ingresos Brutos</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-income)" }}>{fmt(totalRevenue)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Costos Operativos</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-expense)" }}>{fmt(totalExpenses)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Ganancia Neta</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: totalProfit >= 0 ? "var(--color-income)" : "var(--color-expense)" }}>{fmt(totalProfit)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Margen Global</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{overallMargin}%</p>
          </div>
        </div>

        {/* Businesses List or Empty State */}
        {businesses.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🏢</div>
            <p className="empty-state-title">No hay negocios registrados</p>
            <p className="empty-state-desc">Añade tus emprendimientos o actividades comerciales para monitorear ingresos, costos y asociarlos a los integrantes del hogar.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingBiz(null); setShowModal(true); }}>
              <Plus size={14} /> Crear Primer Negocio
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1.25rem" }}>
            {businesses.map(b => {
              const net = b.income - b.expenses;
              const margin = b.income > 0 ? ((net / b.income) * 100).toFixed(1) : "0.0";
              const max = Math.max(b.income, b.expenses, 1);

              return (
                <div key={b.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "var(--color-investment-dim)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-investment)",
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>{b.name}</h3>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem", flexWrap: "wrap" }}>
                          <span className="badge badge-investment" style={{ fontSize: "0.75rem" }}>
                            {b.type}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            • {b.transactions} {b.transactions === 1 ? "transacción" : "transacciones"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => { setEditingBiz(b); setShowModal(true); }}
                        title="Editar negocio"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: "var(--color-expense)" }}
                        onClick={() => handleDelete(b.id, b.name)}
                        title="Eliminar negocio"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Integrantes Asignados */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap", padding: "0.5rem 0.75rem", background: "var(--bg-card-alt)", borderRadius: "var(--radius-sm)" }}>
                    <Users size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Integrantes:</span>
                    {b.members && b.members.length > 0 ? (
                      b.members.map(m => (
                        <span
                          key={m.id}
                          className="badge"
                          style={{
                            fontSize: "0.6875rem",
                            background: "var(--accent-subtle)",
                            color: "var(--accent)",
                            border: "1px solid rgba(99,102,241,0.2)",
                            fontWeight: 600,
                          }}
                        >
                          {m.displayName}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Hogar general</span>
                    )}
                  </div>

                  {b.description && (
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                      {b.description}
                    </p>
                  )}

                  {/* P&L Visual Bars */}
                  <div style={{ background: "var(--bg-card-alt)", padding: "0.875rem", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", width: 60 }}>Ingresos</span>
                      <div style={{ flex: 1, height: 8, background: "var(--bg-hover)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(b.income / max) * 100}%`, background: "var(--color-income)", borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-income)", width: 90, textAlign: "right" }}>
                        {fmt(b.income, b.currency)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", width: 60 }}>Costos</span>
                      <div style={{ flex: 1, height: 8, background: "var(--bg-hover)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(b.expenses / max) * 100}%`, background: "var(--color-expense)", borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-expense)", width: 90, textAlign: "right" }}>
                        {fmt(b.expenses, b.currency)}
                      </span>
                    </div>
                  </div>

                  {/* KPI Summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div style={{ padding: "0.75rem", background: "var(--bg-card-alt)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                      <p style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                        Ganancia Neta
                      </p>
                      <p style={{ fontSize: "1.125rem", fontWeight: 800, color: net >= 0 ? "var(--color-income)" : "var(--color-expense)" }}>
                        {fmt(net, b.currency)}
                      </p>
                    </div>
                    <div style={{ padding: "0.75rem", background: "var(--bg-card-alt)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                      <p style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                        Margen Neto
                      </p>
                      <p style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--accent)" }}>
                        {margin}%
                      </p>
                    </div>
                  </div>

                  {/* Quick Transaction Actions */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <a
                      href={`/dashboard/transactions?business=${b.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", fontSize: "0.75rem" }}
                    >
                      <ExternalLink size={12} /> Ver Transacciones
                    </a>
                    <a
                      href={`/dashboard/transactions?business=${b.id}&new=true`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", fontSize: "0.75rem" }}
                    >
                      <Plus size={12} /> + Registrar
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
