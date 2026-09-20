"use client";

import { useState } from "react";
import {
  Plus, Building2, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2,
  X, Check, ExternalLink, ArrowUpCircle, ArrowDownCircle, Percent
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";

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
}

const INITIAL_BUSINESSES: BusinessItem[] = [];

function BusinessModal({
  onClose,
  onSave,
  initialData,
}: {
  onClose: () => void;
  onSave: (biz: Partial<BusinessItem>) => void;
  initialData?: BusinessItem | null;
}) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    type: initialData?.type ?? "Comercio",
    currency: initialData?.currency ?? "USD",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({
      id: initialData?.id,
      name: form.name,
      description: form.description,
      type: form.type,
      currency: form.currency,
    });
    onClose();
  };

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: "min(500px, 95vw)" }}>
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
                placeholder="Ej: Artesanías Ana"
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Descripción</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Breve descripción del negocio o actividad..."
                value={form.description}
                onChange={e => set("description", e.target.value)}
                style={{ resize: "vertical" }}
              />
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
                  <option value="USD">USD</option>
                  <option value="HNL">HNL</option>
                  <option value="MXN">MXN</option>
                  <option value="EUR">EUR</option>
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
  const [showModal, setShowModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<BusinessItem | null>(null);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const totalRevenue = businesses.reduce((sum, b) => sum + b.income, 0);
  const totalExpenses = businesses.reduce((sum, b) => sum + b.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const handleSave = (saved: Partial<BusinessItem>) => {
    if (saved.id) {
      setBusinesses(prev => prev.map(b => b.id === saved.id ? { ...b, ...saved } as BusinessItem : b));
      toast.success("Negocio actualizado exitosamente");
    } else {
      const newBiz: BusinessItem = {
        id: String(Date.now()),
        name: saved.name!,
        description: saved.description || "",
        type: saved.type || "Comercio",
        currency: saved.currency || "USD",
        income: 0,
        expenses: 0,
        transactions: 0,
        isActive: true,
        monthlyData: [],
      };
      setBusinesses(prev => [newBiz, ...prev]);
      toast.success("Negocio creado exitosamente");
    }
    setEditingBiz(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el negocio "${name}"?`)) {
      setBusinesses(prev => prev.filter(b => b.id !== id));
      toast.info(`Negocio "${name}" eliminado`);
    }
  };

  return (
    <>
      {showModal && (
        <BusinessModal
          onClose={() => { setShowModal(false); setEditingBiz(null); }}
          onSave={handleSave}
          initialData={editingBiz}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Negocios y Emprendimientos</h1>
            <p className="page-subtitle">Estado de resultados (P&L), ingresos y márgenes de ganancia</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingBiz(null); setShowModal(true); }}
          >
            <Plus size={16} /> Nuevo Negocio
          </button>
        </div>

        {/* Global P&L KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
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
            <p className="empty-state-desc">Añade tus emprendimientos o actividades comerciales para monitorear ingresos, costos y márgenes de ganancia.</p>
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
              <div key={b.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                      }}
                    >
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>{b.name}</h3>
                      <span className="badge badge-investment" style={{ fontSize: "0.75rem" }}>
                        {b.type}
                      </span>
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

                {b.description && (
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {b.description}
                  </p>
                )}

                {/* P&L Visual Bars */}
                <div style={{ background: "var(--bg-card-alt)", padding: "1rem", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", width: 60 }}>Ingresos</span>
                    <div style={{ flex: 1, height: 8, background: "var(--bg-hover)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(b.income / max) * 100}%`, background: "var(--color-income)", borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-income)", width: 80, textAlign: "right" }}>
                      {fmt(b.income)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", width: 60 }}>Costos</span>
                    <div style={{ flex: 1, height: 8, background: "var(--bg-hover)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(b.expenses / max) * 100}%`, background: "var(--color-expense)", borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-expense)", width: 80, textAlign: "right" }}>
                      {fmt(b.expenses)}
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
                      {fmt(net)}
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
              </div>
            );
          })}
        </div>
        )}
      </div>
    </>
  );
}
