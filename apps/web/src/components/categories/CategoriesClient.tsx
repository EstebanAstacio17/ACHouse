"use client";

import { useState, useEffect } from "react";
import { Plus, Tag, ChevronRight, Pencil, Trash2, X, Check, Layers } from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { getCategories, createCategory, deleteCategory } from "@/lib/actions/entities";

export interface CategoryChild {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  parentId: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  parentId: string | null;
  children: CategoryChild[];
}

const COLORS = [
  "#1A73E8", "#4285F4",
  "#1E8E3E", "#34A853",
  "#D93025", "#EA4335",
  "#F29900", "#FBBC05",
  "#E65100", "#FF9800",
  "#8E24AA", "#BA68C8",
];

const INITIAL_CATEGORIES: CategoryItem[] = [];

function CategoryModal({
  onClose,
  onSave,
  parent,
  initialData,
}: {
  onClose: () => void;
  onSave: (cat: { name: string; type: "income" | "expense"; color: string; icon: string; parentId?: string | null }) => void;
  parent?: CategoryItem;
  initialData?: CategoryItem | CategoryChild | null;
}) {
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    type: (initialData?.type ?? parent?.type ?? "expense") as "income" | "expense",
    color: initialData?.color ?? parent?.color ?? "#6366f1",
    icon: initialData?.icon ?? "🏷️",
  });
  const [selectedColor, setSelectedColor] = useState(form.color);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      type: form.type,
      color: selectedColor,
      icon: form.icon || "🏷️",
      parentId: parent?.id ?? null,
    });
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
            {parent ? `Subcategoría de "${parent.name}"` : initialData ? "Editar Categoría" : "Nueva Categoría"}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {!parent && !initialData && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["expense", "income"] as const).map(t => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => set("type", t)}
                    style={{
                      flex: 1,
                      padding: "0.625rem",
                      borderRadius: "var(--radius-md)",
                      border: `1.5px solid ${form.type === t ? (t === "expense" ? "var(--color-expense)" : "var(--color-income)") : "var(--border-default)"}`,
                      background: form.type === t ? (t === "expense" ? "var(--color-expense-dim)" : "var(--color-income-dim)") : "transparent",
                      color: form.type === t ? (t === "expense" ? "var(--color-expense)" : "var(--color-income)") : "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "expense" ? "⬇️ Egreso" : "⬆️ Ingreso"}
                  </button>
                ))}
              </div>
            )}

            <div className="form-group">
              <label className="label">Nombre de la categoría *</label>
              <input
                className="input"
                required
                placeholder="Ej: Alimentación, Salario, Mascotas..."
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label">Ícono (Emoji)</label>
              <input
                className="input"
                placeholder="🏷️"
                value={form.icon}
                onChange={e => set("icon", e.target.value)}
                maxLength={4}
                style={{ fontSize: "1.25rem" }}
              />
            </div>

            <div className="form-group">
              <label className="label">Color de distintivo</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => { setSelectedColor(c); set("color", c); }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "var(--radius-sm)",
                      background: c,
                      border: selectedColor === c ? "2.5px solid white" : "2px solid transparent",
                      cursor: "pointer",
                      flexShrink: 0,
                      outline: selectedColor === c ? `2px solid ${c}` : "none",
                      transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ padding: "0.75rem 1rem", background: "var(--bg-active)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.375rem" }}>{form.icon || "🏷️"}</span>
              <span style={{ fontWeight: 700, color: selectedColor, fontSize: "0.9375rem" }}>
                {form.name || "Vista previa de categoría"}
              </span>
              <span className="badge" style={{ marginLeft: "auto", background: `${selectedColor}20`, color: selectedColor, border: `1px solid ${selectedColor}40` }}>
                {form.type === "expense" ? "Egreso" : "Ingreso"}
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> Guardar Categoría
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CategoriesClient() {
  const toast = useToast();
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [showModal, setShowModal] = useState(false);
  const [parentForModal, setParentForModal] = useState<CategoryItem | undefined>();
  const [editingItem, setEditingItem] = useState<CategoryItem | CategoryChild | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  useEffect(() => {
    let active = true;
    getCategories()
      .then((data) => {
        if (active && data) {
          const parents = data.filter((c: any) => !c.parentId);
          const children = data.filter((c: any) => c.parentId);

          const formatted: CategoryItem[] = parents.map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.type as any,
            color: p.color,
            icon: p.icon,
            parentId: null,
            children: children
              .filter((c: any) => c.parentId === p.id)
              .map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type as any,
                color: c.color,
                icon: c.icon,
                parentId: c.parentId,
              })),
          }));

          setCategories(formatted);
        }
      })
      .catch((err) => console.error("Error loading categories:", err));
    return () => {
      active = false;
    };
  }, []);

  const filtered = categories.filter(c => filterType === "all" || c.type === filterType);

  const toggle = (id: string) => setExpanded(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });

  const openModal = (parent?: CategoryItem) => {
    setEditingItem(null);
    setParentForModal(parent);
    setShowModal(true);
  };

  const handleSaveCategory = async (catData: { name: string; type: "income" | "expense"; color: string; icon: string; parentId?: string | null }) => {
    try {
      const res = await createCategory({
        name: catData.name,
        type: catData.type,
        color: catData.color,
        icon: catData.icon,
        parentId: catData.parentId ?? null,
      });
      const created = res.category;

      if (catData.parentId) {
        setCategories(prev =>
          prev.map(p => {
            if (p.id === catData.parentId) {
              const newChild: CategoryChild = {
                id: created.id,
                name: created.name,
                type: created.type as any,
                color: created.color,
                icon: created.icon,
                parentId: catData.parentId!,
              };
              return { ...p, children: [...p.children, newChild] };
            }
            return p;
          })
        );
        setExpanded(s => new Set(s).add(catData.parentId!));
        toast.success(`Subcategoría "${catData.name}" añadida`);
      } else {
        const newCat: CategoryItem = {
          id: created.id,
          name: created.name,
          type: created.type as any,
          color: created.color,
          icon: created.icon,
          parentId: null,
          children: [],
        };
        setCategories(prev => [newCat, ...prev]);
        toast.success(`Categoría "${catData.name}" creada exitosamente`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar categoría");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar la categoría "${name}"?`)) {
      try {
        await deleteCategory(id);
        setCategories(prev => prev.filter(c => c.id !== id));
        toast.info(`Categoría "${name}" eliminada`);
      } catch (err: any) {
        toast.error(err?.message || "Error al eliminar categoría");
      }
    }
  };

  const handleDeleteSubcategory = async (parentId: string, childId: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar la subcategoría "${name}"?`)) {
      try {
        await deleteCategory(childId);
        setCategories(prev =>
          prev.map(p => {
            if (p.id === parentId) {
              return { ...p, children: p.children.filter(c => c.id !== childId) };
            }
            return p;
          })
        );
        toast.info(`Subcategoría "${name}" eliminada`);
      } catch (err: any) {
        toast.error(err?.message || "Error al eliminar subcategoría");
      }
    }
  };

  return (
    <>
      {showModal && (
        <CategoryModal
          onClose={() => { setShowModal(false); setParentForModal(undefined); setEditingItem(null); }}
          onSave={handleSaveCategory}
          parent={parentForModal}
          initialData={editingItem}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Categorías</h1>
            <p className="page-subtitle">Organización jerárquica para etiquetar ingresos y gastos del hogar</p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { label: "Total Categorías", value: categories.length, color: "var(--accent)" },
            { label: "Categorías de Egresos", value: categories.filter(c => c.type === "expense").length, color: "var(--color-expense)" },
            { label: "Categorías de Ingresos", value: categories.filter(c => c.type === "income").length, color: "var(--color-income)" },
          ].map(s => (
            <div key={s.label} className="kpi-card" style={{ textAlign: "center", padding: "1.25rem" }}>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: s.color, letterSpacing: "-0.03em" }}>{s.value}</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {(["all", "expense", "income"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`btn btn-sm ${filterType === t ? "btn-primary" : "btn-secondary"}`}
            >
              {t === "all" ? "Todas" : t === "expense" ? "Egresos" : "Ingresos"}
            </button>
          ))}
        </div>

        {/* Category Tree */}
        {filtered.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🏷️</div>
            <p className="empty-state-title">No hay categorías que coincidan</p>
            <p className="empty-state-desc">Crea tu primera categoría para clasificar los movimientos de tu hogar.</p>
            <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
              <Plus size={14} /> Crear Categoría
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {filtered.map(cat => (
              <div key={cat.id}>
                <div
                  className="card"
                  style={{
                    padding: "0.875rem 1.125rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    transition: "all var(--duration-fast) var(--ease-out)",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-md)",
                      background: `${cat.color}20`,
                      border: `1px solid ${cat.color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      flexShrink: 0,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{cat.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                      {cat.children.length} {cat.children.length === 1 ? "subcategoría" : "subcategorías"}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: cat.type === "expense" ? "var(--color-expense-dim)" : "var(--color-income-dim)",
                      color: cat.type === "expense" ? "var(--color-expense)" : "var(--color-income)",
                      padding: "0.2rem 0.625rem",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    {cat.type === "expense" ? "Egreso" : "Ingreso"}
                  </span>
                  <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => openModal(cat)}
                      title="Añadir subcategoría"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: "var(--color-expense)" }}
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      title="Eliminar categoría"
                    >
                      <Trash2 size={14} />
                    </button>
                    {cat.children.length > 0 && (
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => toggle(cat.id)}
                        title="Expandir/contraer"
                      >
                        <ChevronRight
                          size={16}
                          style={{
                            transform: expanded.has(cat.id) ? "rotate(90deg)" : "none",
                            transition: "transform var(--duration-base) var(--ease-spring)",
                          }}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Children */}
                {expanded.has(cat.id) && cat.children.map(child => (
                  <div key={child.id} style={{ marginLeft: "2.25rem", marginTop: "0.375rem" }}>
                    <div
                      className="card"
                      style={{
                        padding: "0.625rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        background: "var(--bg-active)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div style={{ width: 3, height: 20, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "1.125rem" }}>{child.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: "0.875rem", flex: 1 }}>{child.name}</span>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: "var(--color-expense)" }}
                        onClick={() => handleDeleteSubcategory(cat.id, child.id, child.name)}
                        title="Eliminar subcategoría"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
