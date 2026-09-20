"use client";

import { useState, useEffect } from "react";
import {
  Plus, FolderKanban, Calendar, DollarSign, CheckCircle2, Pause,
  X, Check, User, Building2, Clock, AlertTriangle, CheckCheck,
  Pencil, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/ToastContext";
import { getProjects, createProject, updateProject, deleteProject, getBusinesses } from "@/lib/actions/businesses-projects-loans";
import { getMembers } from "@/lib/actions/entities";

const STATUS_CONFIG = {
  active: { label: "Activo", color: "var(--color-income)", bg: "var(--color-income-dim)" },
  paused: { label: "Pausado", color: "var(--color-warning)", bg: "var(--color-warning-dim)" },
  completed: { label: "Completado", color: "var(--accent)", bg: "var(--accent-subtle)" },
  cancelled: { label: "Cancelado", color: "var(--color-expense)", bg: "var(--color-expense-dim)" },
};

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  budget: number;
  spent: number;
  currency: string;
  status: "active" | "paused" | "completed" | "cancelled";
  startDate: Date;
  endDate: Date | null;
  member: string | null;
  business: string | null;
}

const INITIAL_PROJECTS: ProjectItem[] = [];

// ─── Project Form Modal ────────────────────────────────────────────────────────
function ProjectModal({
  onClose,
  onSave,
  initialData,
  members = [],
  businesses = [],
}: {
  onClose: () => void;
  onSave: (proj: Partial<ProjectItem>) => void;
  initialData?: ProjectItem | null;
  members?: Array<{ id: string; name: string }>;
  businesses?: Array<{ id: string; name: string }>;
}) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    budget: initialData ? String(initialData.budget) : "",
    currency: initialData?.currency ?? "USD",
    startDate: initialData ? format(initialData.startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    endDate: initialData?.endDate ? format(initialData.endDate, "yyyy-MM-dd") : "",
    member: initialData?.member ?? "",
    business: initialData?.business ?? "",
    status: initialData?.status ?? "active",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({
      id: initialData?.id,
      name: form.name,
      description: form.description,
      budget: parseFloat(form.budget) || 0,
      currency: form.currency,
      startDate: new Date(form.startDate),
      endDate: form.endDate ? new Date(form.endDate) : null,
      member: form.member || null,
      business: form.business || null,
      status: form.status as any,
    });
    onClose();
  };

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: "min(520px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {initialData ? "Editar Proyecto" : "Nuevo Proyecto"}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Nombre del proyecto *</label>
              <input
                className="input"
                required
                placeholder="Ej: Remodelación Cocina, Vacaciones..."
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Descripción</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Objetivo del proyecto..."
                value={form.description}
                onChange={e => set("description", e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label"><DollarSign size={12} style={{ display: "inline" }} />Presupuesto total</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.budget}
                  onChange={e => set("budget", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Moneda</label>
                <select className="input" value={form.currency} onChange={e => set("currency", e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="HNL">HNL</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label"><Calendar size={12} style={{ display: "inline" }} />Fecha de inicio *</label>
                <input className="input" type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Fecha fin estimada</label>
                <input className="input" type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label"><User size={12} style={{ display: "inline" }} />Integrante Responsable</label>
                <select className="input" value={form.member} onChange={e => set("member", e.target.value)}>
                  <option value="">Sin asignar / Hogar</option>
                  {members.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label"><Building2 size={12} style={{ display: "inline" }} />Negocio Vinculado</label>
                <select className="input" value={form.business} onChange={e => set("business", e.target.value)}>
                  <option value="">Ninguno / Gastos del Hogar</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> {initialData ? "Actualizar" : "Guardar Proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Project Close Summary Modal ───────────────────────────────────────────────
function CloseProjectModal({
  project,
  onClose,
  onConfirmClose,
}: {
  project: ProjectItem;
  onClose: () => void;
  onConfirmClose: (projectId: string) => void;
}) {
  const variance = project.budget - project.spent;
  const isUnder = variance >= 0;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: project.currency });

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: "min(460px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Cerrar Proyecto</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            ¿Confirmas el cierre del proyecto <strong>{project.name}</strong>? Se generará el resumen financiero final.
          </p>
          <div style={{ background: "var(--surface-2)", padding: "1rem", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Presupuesto Asignado:</span>
              <span style={{ fontWeight: 600 }}>{fmt(project.budget)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Total Ejecutado:</span>
              <span style={{ fontWeight: 600, color: "#f87171" }}>{fmt(project.spent)}</span>
            </div>
            <div className="divider" style={{ margin: "0.25rem 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9375rem" }}>
              <span style={{ fontWeight: 600 }}>Variación Presupuestaria:</span>
              <span style={{ fontWeight: 800, color: isUnder ? "#4ade80" : "#f87171" }}>
                {isUnder ? `+${fmt(variance)} (Ahorro)` : `-${fmt(Math.abs(variance))} (Sobrecosto)`}
              </span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => { onConfirmClose(project.id); onClose(); }}
          >
            <CheckCheck size={15} /> Confirmar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ProjectsClient() {
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProj, setEditingProj] = useState<ProjectItem | null>(null);
  const [closingProj, setClosingProj] = useState<ProjectItem | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [dbProjects, dbMembers, dbBusinesses] = await Promise.all([
        getProjects(),
        getMembers(),
        getBusinesses(),
      ]);

      setProjects(
        dbProjects.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          budget: parseFloat(p.budget ?? "0"),
          spent: 0,
          currency: p.currency ?? "USD",
          status: p.status as any,
          startDate: new Date(p.startDate),
          endDate: p.endDate ? new Date(p.endDate) : null,
          member: p.member?.displayName ?? null,
          business: p.business?.name ?? null,
        }))
      );

      setMembers(dbMembers.map((m: any) => ({ id: m.id, name: m.displayName })));
      setBusinesses(dbBusinesses.map((b: any) => ({ id: b.id, name: b.name })));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);

  const filtered = projects.filter(p => filterStatus === "all" || p.status === filterStatus);

  const handleSave = async (saved: Partial<ProjectItem>) => {
    try {
      if (saved.id) {
        await updateProject(saved.id, {
          name: saved.name,
          description: saved.description,
          budget: saved.budget,
          status: saved.status,
          endDate: saved.endDate ? saved.endDate.toISOString().split("T")[0] : undefined,
        });
        toast.success("Proyecto actualizado exitosamente");
      } else {
        const foundMember = members.find(m => m.name === saved.member);
        const foundBiz = businesses.find(b => b.name === saved.business);

        await createProject({
          name: saved.name!,
          description: saved.description,
          budget: saved.budget,
          currency: saved.currency,
          startDate: saved.startDate ? saved.startDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          endDate: saved.endDate ? saved.endDate.toISOString().split("T")[0] : undefined,
          memberId: foundMember?.id,
          businessId: foundBiz?.id,
        });
        toast.success("Proyecto creado exitosamente");
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar proyecto");
    }
    setEditingProj(null);
  };

  const handleConfirmClose = async (id: string) => {
    try {
      await updateProject(id, { status: "completed" });
      toast.success("Proyecto cerrado y registrado como completado");
      await loadData();
    } catch (err: any) {
      toast.error("Error al cerrar el proyecto");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el proyecto "${name}"?`)) {
      try {
        await deleteProject(id);
        toast.info(`Proyecto "${name}" eliminado`);
        await loadData();
      } catch (err: any) {
        toast.error("Error al eliminar el proyecto");
      }
    }
  };

  return (
    <>
      {showModal && (
        <ProjectModal
          onClose={() => { setShowModal(false); setEditingProj(null); }}
          onSave={handleSave}
          initialData={editingProj}
          members={members}
          businesses={businesses}
        />
      )}

      {closingProj && (
        <CloseProjectModal
          project={closingProj}
          onClose={() => setClosingProj(null)}
          onConfirmClose={handleConfirmClose}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Proyectos con Presupuesto</h1>
            <p className="page-subtitle">Monitoreo de ejecución presupuestaria, metas de ahorro y remodelaciones</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingProj(null); setShowModal(true); }}
          >
            <Plus size={16} /> Nuevo Proyecto
          </button>
        </div>

        {/* Global Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Presupuesto Total</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#a5b4fc" }}>{fmt(totalBudget)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Total Ejecutado</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f87171" }}>{fmt(totalSpent)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Saldo Disponible</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: (totalBudget - totalSpent) >= 0 ? "#4ade80" : "#f87171" }}>
              {fmt(totalBudget - totalSpent)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {["all", "active", "completed", "paused"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`btn btn-sm ${filterStatus === s ? "btn-primary" : "btn-secondary"}`}
            >
              {s === "all" ? "Todos" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}
            </button>
          ))}
        </div>

        {/* Projects Grid or Empty State */}
        {filtered.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-title">{projects.length === 0 ? "No hay proyectos registrados" : "No hay proyectos con este filtro"}</p>
            <p className="empty-state-desc">{projects.length === 0 ? "Crea proyectos para asignar presupuestos específicos como remodelaciones, viajes o fondos familiares." : "Intenta seleccionando otro filtro de estado."}</p>
            {projects.length === 0 && (
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingProj(null); setShowModal(true); }}>
                <Plus size={14} /> Crear Primer Proyecto
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
            {filtered.map(proj => {
            const statusCfg = STATUS_CONFIG[proj.status] ?? STATUS_CONFIG.active;
            const progress = proj.budget > 0 ? (proj.spent / proj.budget) * 100 : 0;
            const isOverBudget = proj.budget > 0 && proj.spent > proj.budget;

            return (
              <div key={proj.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: `${statusCfg.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: statusCfg.color,
                      }}
                    >
                      <FolderKanban size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{proj.name}</h3>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: statusCfg.color,
                          background: statusCfg.bg,
                          padding: "0.15rem 0.5rem",
                          borderRadius: 999,
                        }}
                      >
                        ● {statusCfg.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    {proj.status === "active" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#a5b4fc", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                        onClick={() => setClosingProj(proj)}
                        title="Cerrar proyecto"
                      >
                        Cerrar
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => { setEditingProj(proj); setShowModal(true); }}
                      title="Editar proyecto"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: "#f87171" }}
                      onClick={() => handleDelete(proj.id, proj.name)}
                      title="Eliminar proyecto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {proj.description && (
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {proj.description}
                  </p>
                )}

                {/* Budget Progress Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      Gastado: <strong style={{ color: "var(--text-primary)" }}>{fmt(proj.spent)}</strong>
                    </span>
                    <span style={{ fontWeight: 700, color: isOverBudget ? "#f87171" : "var(--text-primary)" }}>
                      {progress.toFixed(0)}% de {fmt(proj.budget)}
                    </span>
                  </div>

                  <div className="progress-bar" style={{ height: 9 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        background: isOverBudget
                          ? "linear-gradient(90deg, #ea580c, #ef4444)"
                          : "linear-gradient(90deg, #6366f1, #818cf8)",
                      }}
                    />
                  </div>

                  {isOverBudget && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "0.375rem", color: "#f87171", fontSize: "0.75rem" }}>
                      <AlertTriangle size={12} />
                      <span>Excedió el presupuesto por {fmt(proj.spent - proj.budget)}</span>
                    </div>
                  )}
                </div>

                {/* Metadata tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {proj.member && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--surface-2)", padding: "0.2rem 0.5rem", borderRadius: 4 }}>
                      <User size={11} /> {proj.member}
                    </span>
                  )}
                  {proj.business && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--surface-2)", padding: "0.2rem 0.5rem", borderRadius: 4 }}>
                      <Building2 size={11} /> {proj.business}
                    </span>
                  )}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                    <Clock size={11} /> {format(proj.startDate, "dd MMM", { locale: es })}
                    {proj.endDate && ` – ${format(proj.endDate, "dd MMM yyyy", { locale: es })}`}
                  </span>
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
