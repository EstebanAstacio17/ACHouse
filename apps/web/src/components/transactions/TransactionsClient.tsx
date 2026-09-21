"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, Filter, Download, ArrowUpCircle, ArrowDownCircle,
  ArrowLeftRight, Pencil, Trash2, ChevronLeft, ChevronRight,
  X, Check, Calendar, CreditCard, Tag, User, Paperclip, Repeat,
  FileSpreadsheet, Eye, AlertCircle, Building2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/ToastContext";
import { useUser } from "@clerk/nextjs";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { getAccounts, getCategories, getMembers } from "@/lib/actions/entities";
import { getBusinesses } from "@/lib/actions/businesses-projects-loans";

// ─── Initial / Demo Data ───────────────────────────────────────────────────────
export interface TransactionItem {
  id: string;
  description: string;
  category: { id?: string; name: string; color: string } | null;
  account: { id?: string; name: string };
  toAccount?: { id?: string; name: string } | null;
  member: { id?: string; displayName: string } | null;
  business?: { id?: string; name: string } | null;
  type: "income" | "expense" | "transfer";
  amount: string;
  currency: string;
  date: Date;
  status: "cleared" | "pending" | "reconciled";
  attachmentUrl?: string | null;
  isRecurring?: boolean;
  recurringFrequency?: string;
  notes?: string;
}

const INITIAL_TRANSACTIONS: TransactionItem[] = [];

const TYPE_CONFIG = {
  income: { label: "Ingreso", color: "var(--color-income)", Icon: ArrowUpCircle, bg: "var(--color-income-dim)" },
  expense: { label: "Egreso", color: "var(--color-expense)", Icon: ArrowDownCircle, bg: "var(--color-expense-dim)" },
  transfer: { label: "Transferencia", color: "var(--color-transfer)", Icon: ArrowLeftRight, bg: "var(--color-transfer-dim)" },
};

const STATUS_CONFIG = {
  cleared: { label: "Conciliado", color: "var(--color-income)" },
  pending: { label: "Pendiente", color: "var(--color-warning)" },
  reconciled: { label: "Reconciliado", color: "var(--accent)" },
};

const CATEGORIES_LIST = [
  { id: "cat1", name: "Alimentación", color: "#6366f1", type: "expense" as const },
  { id: "cat2", name: "Transporte", color: "#f97316", type: "expense" as const },
  { id: "cat3", name: "Vivienda", color: "#8b5cf6", type: "expense" as const },
  { id: "cat4", name: "Salud", color: "#06b6d4", type: "expense" as const },
  { id: "cat5", name: "Entretenimiento", color: "#ec4899", type: "expense" as const },
  { id: "cat6", name: "Salario", color: "#22c55e", type: "income" as const },
  { id: "cat7", name: "Negocios", color: "#14b8a6", type: "income" as const },
  { id: "cat8", name: "Deudas", color: "#f59e0b", type: "expense" as const },
  { id: "cat9", name: "Servicios", color: "#84cc16", type: "expense" as const },
];

const ACCOUNTS_LIST = [
  { id: "acc1", name: "Cuenta Corriente", currency: "DOP" },
  { id: "acc2", name: "Tarjeta Visa", currency: "DOP" },
  { id: "acc3", name: "Cuenta Ahorros", currency: "DOP" },
  { id: "acc4", name: "Efectivo", currency: "DOP" },
];

const MEMBERS_LIST = [
  { id: "mem1", displayName: "Ana M." },
  { id: "mem2", displayName: "Carlos R." },
  { id: "mem3", displayName: "Hogar" },
];

// ─── Transaction Form Modal ────────────────────────────────────────────────────
function TransactionModal({
  onClose,
  onSave,
  initialData,
  categoriesList = [],
  accountsList = [],
  membersList = [],
  businessesList = [],
  currentMemberId,
}: {
  onClose: () => void;
  onSave: (tx: Partial<TransactionItem>) => void;
  initialData?: TransactionItem | null;
  categoriesList: Array<{ id: string; name: string; color?: string; type?: "income" | "expense" }>;
  accountsList: Array<{ id: string; name: string; currency?: string }>;
  membersList: Array<{ id: string; displayName: string; clerkUserId?: string; isCurrentUser?: boolean }>;
  businessesList?: Array<{ id: string; name: string; type?: string }>;
  currentMemberId?: string;
}) {
  const normalizeType = (t?: string | null) => {
    if (!t) return "";
    const s = String(t).toLowerCase().trim();
    if (s === "income" || s === "ingreso" || s === "ingresos") return "income";
    if (s === "expense" || s === "egreso" || s === "egresos") return "expense";
    if (s === "transfer" || s === "transferencia" || s === "transferencias") return "transfer";
    return s;
  };

  const initialType = (initialData?.type ?? "expense") as "income" | "expense" | "transfer";
  const initialNormType = normalizeType(initialType);
  const matchingInitialCats = categoriesList.filter(c => initialNormType === "transfer" ? true : normalizeType(c.type) === initialNormType);
  const defaultCatId = initialData?.category?.id || (matchingInitialCats.find(c => c.name === initialData?.category?.name)?.id ?? (matchingInitialCats[0]?.id || ""));

  const initialBusinessId = useMemo(() => {
    if (initialData?.business?.id) return initialData.business.id;
    if (initialData?.category?.name) {
      const match = businessesList.find(b => b.name.toLowerCase().trim() === initialData.category?.name.toLowerCase().trim());
      if (match) return match.id;
    }
    return "";
  }, [initialData, businessesList]);

  const initialMemberId = useMemo(() => {
    if (initialData?.member?.id) return initialData.member.id;
    if (initialData?.member?.displayName) {
      const match = membersList.find(m => m.displayName === initialData.member?.displayName);
      if (match) return match.id;
    }
    // Nueva transacción: pre-seleccionar al usuario conectado
    if (currentMemberId) return currentMemberId;
    const currentM = membersList.find(m => m.isCurrentUser);
    if (currentM) return currentM.id;
    return membersList[0]?.id || "";
  }, [initialData, currentMemberId, membersList]);

  const [memberManuallySelected, setMemberManuallySelected] = useState(false);

  const [form, setForm] = useState({
    type: initialType,
    amount: initialData?.amount ?? "",
    description: initialData?.description ?? "",
    date: initialData ? format(initialData.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    categoryId: defaultCatId,
    accountId: initialData?.account?.id || (accountsList.find(a => a.name === initialData?.account?.name)?.id ?? (accountsList[0]?.id || "")),
    toAccountId: initialData?.toAccount?.id || (accountsList[1]?.id || ""),
    memberId: initialMemberId,
    businessId: initialBusinessId,
    transferFlow: "expense" as "income" | "expense",
    status: initialData?.status ?? "cleared",
    isRecurring: initialData?.isRecurring ?? false,
    recurringFrequency: initialData?.recurringFrequency ?? "Mensual",
    attachmentUrl: initialData?.attachmentUrl ?? "",
    notes: initialData?.notes ?? "",
  });

  useEffect(() => {
    if (!initialData && !memberManuallySelected && currentMemberId) {
      set("memberId", currentMemberId);
    } else if (!form.memberId && membersList.length > 0) {
      const target = (currentMemberId && membersList.find(m => m.id === currentMemberId))
        || membersList.find(m => m.isCurrentUser)
        || membersList[0];
      if (target) {
        set("memberId", target.id);
      }
    }
  }, [membersList, form.memberId, currentMemberId, initialData, memberManuallySelected]);

  const toast = useToast();
  const [fileName, setFileName] = useState<string>("");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { businessCategories, generalCategories } = useMemo(() => {
    const targetNorm = normalizeType(form.type);
    const available = targetNorm === "transfer"
      ? categoriesList
      : categoriesList.filter(c => normalizeType(c.type) === targetNorm);

    const bizNames = new Set(businessesList.map(b => b.name.toLowerCase().trim()));
    const bizCats: typeof categoriesList = [];
    const genCats: typeof categoriesList = [];

    available.forEach(c => {
      if (bizNames.has(c.name.toLowerCase().trim())) {
        bizCats.push(c);
      } else {
        genCats.push(c);
      }
    });

    return { businessCategories: bizCats, generalCategories: genCats };
  }, [categoriesList, businessesList, form.type]);

  const handleCategoryChange = (newCatId: string) => {
    const cat = categoriesList.find(c => c.id === newCatId);
    let linkedBizId = form.businessId;
    if (cat) {
      const matchBiz = businessesList.find(b => b.name.toLowerCase().trim() === cat.name.toLowerCase().trim());
      if (matchBiz) {
        linkedBizId = matchBiz.id;
      }
    }
    setForm(prev => ({
      ...prev,
      categoryId: newCatId,
      businessId: linkedBizId,
    }));
  };

  const handleBusinessChange = (newBizId: string) => {
    let linkedCatId = form.categoryId;
    if (newBizId) {
      const biz = businessesList.find(b => b.id === newBizId);
      if (biz) {
        const targetNorm = normalizeType(form.type);
        const desiredType = targetNorm === "transfer" ? form.transferFlow : targetNorm;
        const matchCat = categoriesList.find(
          c => c.name.toLowerCase().trim() === biz.name.toLowerCase().trim() && normalizeType(c.type) === desiredType
        );
        if (matchCat) {
          linkedCatId = matchCat.id;
        }
      }
    } else {
      const currentCat = categoriesList.find(c => c.id === form.categoryId);
      if (currentCat && businessesList.some(b => b.name.toLowerCase().trim() === currentCat.name.toLowerCase().trim())) {
        linkedCatId = "";
      }
    }
    setForm(prev => ({
      ...prev,
      businessId: newBizId,
      categoryId: linkedCatId,
    }));
  };

  const handleTypeChange = (newType: "income" | "expense" | "transfer") => {
    const targetNorm = normalizeType(newType);
    setForm(prev => {
      let newCatId = "";
      if (prev.businessId) {
        const biz = businessesList.find(b => b.id === prev.businessId);
        if (biz) {
          const desiredType = targetNorm === "transfer" ? prev.transferFlow : targetNorm;
          const matchCat = categoriesList.find(
            c => c.name.toLowerCase().trim() === biz.name.toLowerCase().trim() && normalizeType(c.type) === desiredType
          );
          if (matchCat) newCatId = matchCat.id;
        }
      }
      if (!newCatId) {
        const matchingCats = categoriesList.filter(c => targetNorm === "transfer" ? true : normalizeType(c.type) === targetNorm);
        const stillValid = matchingCats.some(c => c.id === prev.categoryId);
        newCatId = stillValid ? prev.categoryId : (matchingCats[0]?.id || "");
      }
      return {
        ...prev,
        type: newType,
        categoryId: newCatId,
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        set("attachmentUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const activeBusiness = useMemo(() => {
    if (form.businessId) {
      return businessesList.find(b => b.id === form.businessId) || null;
    }
    const cat = categoriesList.find(c => c.id === form.categoryId);
    if (cat) {
      return businessesList.find(b => b.name.toLowerCase().trim() === cat.name.toLowerCase().trim()) || null;
    }
    return null;
  }, [form.businessId, form.categoryId, businessesList, categoriesList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = (form.description || "").trim();
    if (!cleanDesc) {
      toast.error("Por favor ingresa una descripción para la transacción");
      return;
    }

    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("El monto debe ser un valor numérico mayor a 0");
      return;
    }

    const selectedCat = categoriesList.find(c => c.id === form.categoryId);
    const selectedAcc = accountsList.find(a => a.id === form.accountId) || accountsList[0];
    const selectedToAcc = accountsList.find(a => a.id === form.toAccountId);
    const selectedMem = membersList.find(m => m.id === form.memberId) || (membersList.length > 0 ? membersList[0] : null);

    let resolvedBiz = businessesList.find(b => b.id === form.businessId);
    if (!resolvedBiz && selectedCat) {
      resolvedBiz = businessesList.find(b => b.name.toLowerCase().trim() === selectedCat.name.toLowerCase().trim());
    }

    onSave({
      id: initialData?.id,
      description: cleanDesc,
      type: form.type as any,
      amount: amountNum.toFixed(2),
      currency: selectedAcc?.currency || "DOP",
      date: new Date(form.date + "T12:00:00"),
      status: form.status as any,
      category: selectedCat ? { id: selectedCat.id, name: selectedCat.name, color: selectedCat.color || "#6366f1" } : null,
      account: selectedAcc ? { id: selectedAcc.id, name: selectedAcc.name } : { name: "Principal" },
      toAccount: form.type === "transfer" && selectedToAcc ? { id: selectedToAcc.id, name: selectedToAcc.name } : null,
      member: selectedMem ? { id: selectedMem.id, displayName: selectedMem.displayName } : null,
      business: resolvedBiz ? { id: resolvedBiz.id, name: resolvedBiz.name } : null,
      isRecurring: form.isRecurring,
      recurringFrequency: form.isRecurring ? form.recurringFrequency : undefined,
      attachmentUrl: form.attachmentUrl || null,
      notes: form.notes,
    });
    onClose();
  };

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ width: "min(580px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {initialData ? "Editar Transacción" : "Nueva Transacción"}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Type Selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {(["income", "expense", "transfer"] as const).map(t => {
                const cfg = TYPE_CONFIG[t];
                const active = form.type === t;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    style={{
                      padding: "0.625rem",
                      borderRadius: "var(--radius-md)",
                      border: `1.5px solid ${active ? cfg.color : "var(--border-default)"}`,
                      background: active ? cfg.bg : "transparent",
                      color: active ? cfg.color : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                  >
                    <cfg.Icon size={15} /> {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Active Business Notification Banner */}
            {activeBusiness && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--color-investment-dim)",
                  border: "1px solid var(--border-subtle)",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-investment)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                <Building2 size={16} style={{ flexShrink: 0 }} />
                <span>
                  Vinculado a la empresa <strong>{activeBusiness.name}</strong> ({activeBusiness.type || "Negocio"}). Impactará su flujo financiero y P&L.
                </span>
              </div>
            )}

            {/* Amount */}
            <div className="form-group">
              <label className="label">Monto *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 700 }}>$</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  style={{ paddingLeft: "2rem", fontSize: "1.125rem", fontWeight: 700 }}
                  value={form.amount}
                  onChange={e => set("amount", e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="label">Descripción *</label>
              <input
                className="input"
                required
                placeholder="Ej: Supermercado, Salario quincenal, Gasolina, Venta de producto..."
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {/* Date */}
              <div className="form-group">
                <label className="label"><Calendar size={12} style={{ display: "inline", marginRight: 4 }} />Fecha *</label>
                <input className="input" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
              {/* Status */}
              <div className="form-group">
                <label className="label">Estado</label>
                <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="cleared">Conciliado</option>
                  <option value="pending">Pendiente</option>
                  <option value="reconciled">Reconciliado</option>
                </select>
              </div>
            </div>

            {/* Account and Category Selection */}
            {form.type === "transfer" ? (
              <>
                {/* Transfer: Source and Target Accounts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="label">
                      <CreditCard size={12} style={{ display: "inline", marginRight: 4 }} />
                      Cuenta Origen *
                    </label>
                    <select className="input" value={form.accountId} onChange={e => set("accountId", e.target.value)}>
                      {accountsList.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">
                      <ArrowLeftRight size={12} style={{ display: "inline", marginRight: 4 }} />
                      Cuenta Destino *
                    </label>
                    <select className="input" value={form.toAccountId} onChange={e => set("toAccountId", e.target.value)}>
                      {accountsList.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transfer: Category and Business */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="label">
                      <Tag size={12} style={{ display: "inline", marginRight: 4 }} />
                      Categoría (Opcional)
                    </label>
                    <select
                      className="input"
                      value={form.categoryId}
                      onChange={e => handleCategoryChange(e.target.value)}
                    >
                      <option value="">Sin categoría</option>
                      {businessCategories.length > 0 && (
                        <optgroup label="🏢 Empresas y Negocios">
                          {businessCategories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.type === "income" ? "Entrada" : "Salida"})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {generalCategories.length > 0 && (
                        <optgroup label="📂 Categorías Generales">
                          {generalCategories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">
                      <Building2 size={12} style={{ display: "inline", marginRight: 4 }} />
                      Empresa / Negocio (Opcional)
                    </label>
                    <select
                      className="input"
                      value={form.businessId}
                      onChange={e => handleBusinessChange(e.target.value)}
                    >
                      <option value="">(Ninguno - Finanzas Hogar)</option>
                      {businessesList.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.type ? `(${b.type})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transfer: Member & Flow Direction */}
                <div style={{ display: "grid", gridTemplateColumns: form.businessId ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="label"><User size={12} style={{ display: "inline", marginRight: 4 }} />Integrante Responsable</label>
                    <select
                      className="input"
                      value={form.memberId}
                      onChange={e => {
                        setMemberManuallySelected(true);
                        set("memberId", e.target.value);
                      }}
                    >
                      {membersList.length === 0 ? (
                        <option value="">Cargando integrantes del hogar...</option>
                      ) : (
                        membersList.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.displayName}{m.isCurrentUser || m.id === currentMemberId ? " (Tú)" : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {form.businessId && (
                    <div className="form-group">
                      <label className="label">Impacto en el Negocio</label>
                      <select
                        className="input"
                        value={form.transferFlow}
                        onChange={e => {
                          const val = e.target.value as "income" | "expense";
                          set("transferFlow", val);
                          const biz = businessesList.find(b => b.id === form.businessId);
                          if (biz) {
                            const matchCat = categoriesList.find(
                              c => c.name.toLowerCase().trim() === biz.name.toLowerCase().trim() && c.type === val
                            );
                            if (matchCat) set("categoryId", matchCat.id);
                          }
                        }}
                      >
                        <option value="expense">Flujo de Salida (Egreso / Pago / Costo)</option>
                        <option value="income">Flujo de Entrada (Ingreso / Aporte / Cobro)</option>
                      </select>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Income / Expense: Account and Category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="label">
                      <CreditCard size={12} style={{ display: "inline", marginRight: 4 }} />
                      Cuenta *
                    </label>
                    <select className="input" value={form.accountId} onChange={e => set("accountId", e.target.value)}>
                      {accountsList.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">
                      <Tag size={12} style={{ display: "inline", marginRight: 4 }} />
                      Categoría
                    </label>
                    <select
                      className="input"
                      value={form.categoryId}
                      onChange={e => handleCategoryChange(e.target.value)}
                    >
                      <option value="">Sin categoría</option>
                      {businessCategories.length > 0 && (
                        <optgroup label="🏢 Empresas y Negocios">
                          {businessCategories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {generalCategories.length > 0 && (
                        <optgroup label="📂 Categorías del Hogar">
                          {generalCategories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>

                {/* Income / Expense: Member and Business */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="label"><User size={12} style={{ display: "inline", marginRight: 4 }} />Integrante Responsable</label>
                    <select
                      className="input"
                      value={form.memberId}
                      onChange={e => {
                        setMemberManuallySelected(true);
                        set("memberId", e.target.value);
                      }}
                    >
                      {membersList.length === 0 ? (
                        <option value="">Cargando integrantes del hogar...</option>
                      ) : (
                        membersList.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.displayName}{m.isCurrentUser || m.id === currentMemberId ? " (Tú)" : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">
                      <Building2 size={12} style={{ display: "inline", marginRight: 4 }} />
                      Empresa / Negocio (Opcional)
                    </label>
                    <select
                      className="input"
                      value={form.businessId}
                      onChange={e => handleBusinessChange(e.target.value)}
                    >
                      <option value="">(Ninguno - Finanzas Hogar)</option>
                      {businessesList.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.type ? `(${b.type})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Recurring Section */}
            <div style={{ background: "var(--surface-2)", padding: "0.875rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Repeat size={15} color="var(--color-brand-400)" />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Transacción Recurrente</span>
                </div>
                <input
                  type="checkbox"
                  id="rec_check"
                  checked={form.isRecurring}
                  onChange={e => set("isRecurring", e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--color-brand-500)" }}
                />
              </div>
              {form.isRecurring && (
                <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                  <label className="label">Frecuencia de repetición</label>
                  <select className="input" value={form.recurringFrequency} onChange={e => set("recurringFrequency", e.target.value)}>
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
              )}
            </div>

            {/* Attachment Section */}
            <div className="form-group">
              <label className="label"><Paperclip size={12} style={{ display: "inline", marginRight: 4 }} />Comprobante / Recibo</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
                  <Paperclip size={13} /> {fileName ? "Cambiar Archivo" : "Subir Recibo (JPG/PNG/PDF)"}
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
                </label>
                {fileName && <span style={{ fontSize: "0.75rem", color: "var(--color-brand-300)" }}>{fileName}</span>}
              </div>
              {form.attachmentUrl && form.attachmentUrl.startsWith("data:image") && (
                <div style={{ marginTop: "0.5rem" }}>
                  <img src={form.attachmentUrl} alt="Comprobante" style={{ maxHeight: 100, borderRadius: 6, border: "1px solid var(--border-default)" }} />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> {initialData ? "Actualizar" : "Guardar Transacción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TransactionsClient() {
  const toast = useToast();
  const { user } = useUser();
  const [transactionsList, setTransactionsList] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);
  const [accountsList, setAccountsList] = useState<Array<{ id: string; name: string; currency?: string }>>([]);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string; color: string; type?: "income" | "expense" }>>([]);
  const [membersList, setMembersList] = useState<Array<{ id: string; displayName: string; clerkUserId?: string; isCurrentUser?: boolean }>>([]);
  const [businessesList, setBusinessesList] = useState<Array<{ id: string; name: string; type?: string }>>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TransactionItem | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBusiness, setFilterBusiness] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [datePreset, setDatePreset] = useState<"all" | "thisMonth" | "today">("all");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const isRoleName = (name?: string | null) => {
    if (!name || !name.trim()) return true;
    const lower = name.trim().toLowerCase();
    return (
      lower === "administrador" ||
      lower === "admin" ||
      lower === "colaborador" ||
      lower === "contributor" ||
      lower === "lector" ||
      lower === "viewer" ||
      lower === "miembro" ||
      lower === "nuevo miembro"
    );
  };

  const getResolvedUserName = () => {
    if (!user) return null;
    return (
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      null
    );
  };

  const formatMemberName = (displayName?: string | null) => {
    if (!displayName) return "Hogar";
    if (isRoleName(displayName)) {
      const resolved = getResolvedUserName();
      if (resolved) return resolved;
    }
    return displayName;
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      getTransactions({ perPage: 100 }),
      getAccounts(),
      getCategories(),
      getMembers(),
      getBusinesses(),
    ]).then(([txs, accs, cats, mems, bizs]) => {
      if (!active) return;
      if (accs) {
        setAccountsList(accs.map((a: any) => ({ id: a.id, name: a.name, currency: a.currency })));
      }
      if (cats) {
        setCategoriesList(cats.map((c: any) => ({ id: c.id, name: c.name, color: c.color, type: c.type })));
      }
      if (bizs) {
        setBusinessesList(bizs.map((b: any) => ({ id: b.id, name: b.name, type: b.type })));
      }
      if (mems) {
        const resolved = getResolvedUserName();
        setMembersList(
          mems.map((m: any) => {
            const isCurrent = Boolean(m.isCurrentUser || (user && m.clerkUserId === user.id));
            const name = isRoleName(m.displayName) && isCurrent && resolved
              ? resolved
              : (m.displayName || "Integrante");
            return {
              id: m.id,
              displayName: name,
              clerkUserId: m.clerkUserId,
              isCurrentUser: isCurrent,
            };
          })
        );
      }
      if (txs) {
        setTransactionsList(
          txs.map((t: any) => {
            let bizObj = t.business ? { id: t.business.id, name: t.business.name } : null;
            if (!bizObj && t.category && bizs) {
              const matchBiz = bizs.find(
                (b: any) => b.name.toLowerCase().trim() === t.category.name.toLowerCase().trim()
              );
              if (matchBiz) {
                bizObj = { id: matchBiz.id, name: matchBiz.name };
              }
            }
            return {
              id: t.id,
              description: t.description,
              type: t.type as any,
              amount: String(t.amount),
              currency: t.currency || "DOP",
              date: new Date(t.date),
              status: t.status as any,
              category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color } : null,
              account: t.account ? { id: t.account.id, name: t.account.name } : { name: "Cuenta" },
              toAccount: t.toAccount ? { id: t.toAccount.id, name: t.toAccount.name } : null,
              member: t.member ? { id: t.member.id, displayName: formatMemberName(t.member.displayName) } : null,
              business: bizObj,
              isRecurring: t.isRecurring,
              notes: t.notes,
            };
          })
        );
      }
    }).catch(err => console.error("Error loading transactions:", err));
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const resolved = getResolvedUserName();
    if (!resolved && !user) return;
    setMembersList(prev =>
      prev.map(m => {
        const isCurrent = Boolean(m.isCurrentUser || (user && m.clerkUserId === user.id));
        return {
          ...m,
          isCurrentUser: isCurrent,
          displayName: isCurrent && isRoleName(m.displayName) && resolved ? resolved : m.displayName,
        };
      })
    );
  }, [user]);

  const currentMember =
    membersList.find(m => m.isCurrentUser) ||
    (user && membersList.find(m => m.clerkUserId === user.id)) ||
    (user && membersList.find(m => m.displayName.toLowerCase() === (user.fullName || "").toLowerCase()));
  const currentMemberId = currentMember?.id;

  // Filter logic
  const filtered = useMemo(() => {
    return transactionsList.filter(tx => {
      const matchSearch = !search ||
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        (tx.category?.name && tx.category.name.toLowerCase().includes(search.toLowerCase())) ||
        (tx.business?.name && tx.business.name.toLowerCase().includes(search.toLowerCase())) ||
        tx.account.name.toLowerCase().includes(search.toLowerCase());

      const matchType = filterType === "all" || tx.type === filterType;
      const matchAccount = filterAccount === "all" || tx.account.name === filterAccount;
      const matchCategory = filterCategory === "all" || (tx.category && tx.category.name === filterCategory);
      const matchBusiness =
        filterBusiness === "all" ||
        (filterBusiness === "none" && !tx.business) ||
        (tx.business && (tx.business.id === filterBusiness || (businessesList.find(b => b.id === filterBusiness)?.name.toLowerCase().trim() === tx.category?.name?.toLowerCase().trim())));
      const matchStatus = filterStatus === "all" || tx.status === filterStatus;

      let matchDate = true;
      if (datePreset === "today") {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        matchDate = format(tx.date, "yyyy-MM-dd") === todayStr;
      } else if (datePreset === "thisMonth") {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        matchDate = tx.date.getMonth() === currentMonth && tx.date.getFullYear() === currentYear;
      }

      return matchSearch && matchType && matchAccount && matchCategory && matchBusiness && matchStatus && matchDate;
    });
  }, [transactionsList, search, filterType, filterAccount, filterCategory, filterBusiness, businessesList, filterStatus, datePreset]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage) || 1;

  const totals = useMemo(() => ({
    income: filtered.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0),
    expense: filtered.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0),
  }), [filtered]);

  const fmt = (n: number, currency = "DOP") => {
    try {
      return n.toLocaleString("es-DO", { style: "currency", currency });
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  };

  const handleSaveTransaction = async (saved: Partial<TransactionItem>) => {
    try {
      let resolvedBiz = saved.business;
      if (!resolvedBiz && saved.category?.name && businessesList.length > 0) {
        const match = businessesList.find(b => b.name.toLowerCase().trim() === saved.category?.name.toLowerCase().trim());
        if (match) resolvedBiz = { id: match.id, name: match.name };
      }

      if (saved.id) {
        const res = await updateTransaction(saved.id, {
          description: saved.description,
          amount: saved.amount !== undefined ? parseFloat(saved.amount) : undefined,
          type: saved.type,
          status: saved.status,
          categoryId: saved.category?.id || undefined,
          accountId: saved.account?.id || undefined,
          memberId: saved.member?.id || undefined,
          businessId: resolvedBiz?.id || undefined,
          date: saved.date ? saved.date.toISOString() : undefined,
        });
        if (res && !res.success) {
          toast.error(res.error || "Error al actualizar la transacción");
          return;
        }
        setTransactionsList(prev => prev.map(t => t.id === saved.id ? { ...t, ...saved, business: resolvedBiz || null } as TransactionItem : t));
        toast.success("Transacción actualizada exitosamente");
      } else {
        const res = await createTransaction({
          description: saved.description!,
          amount: parseFloat(saved.amount || "0"),
          type: saved.type!,
          accountId: saved.account?.id || (accountsList[0]?.id ?? ""),
          toAccountId: saved.toAccount?.id || undefined,
          categoryId: saved.category?.id || undefined,
          memberId: saved.member?.id || undefined,
          businessId: resolvedBiz?.id || undefined,
          date: saved.date ? saved.date.toISOString() : new Date().toISOString(),
          status: saved.status || "cleared",
          isRecurring: Boolean(saved.isRecurring),
        });
        if (!res || !res.success || !res.transaction) {
          toast.error(res?.error || "Error al registrar la transacción");
          return;
        }
        const created = res.transaction;
        const newTx: TransactionItem = {
          id: created.id,
          description: created.description,
          type: created.type as any,
          amount: String(created.amount),
          currency: created.currency || saved.currency || "DOP",
          date: new Date(created.date),
          status: created.status as any,
          category: saved.category || null,
          account: saved.account || { name: "Principal" },
          toAccount: saved.toAccount || null,
          member: saved.member || null,
          business: resolvedBiz || null,
          isRecurring: created.isRecurring,
          notes: saved.notes || undefined,
        };
        setTransactionsList(prev => [newTx, ...prev]);
        toast.success("Transacción registrada exitosamente");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al registrar la transacción");
    }
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar esta transacción?")) {
      try {
        await deleteTransaction(id);
        setTransactionsList(prev => prev.filter(t => t.id !== id));
        toast.info("Transacción eliminada");
      } catch (err: any) {
        toast.error(err?.message || "Error al eliminar");
      }
    }
  };

  const exportToExcel = () => {
    const dataToExport = filtered.map(t => ({
      Fecha: format(t.date, "yyyy-MM-dd"),
      Tipo: t.type === "income" ? "Ingreso" : t.type === "expense" ? "Egreso" : "Transferencia",
      Descripción: t.description,
      "Empresa / Negocio": t.business?.name || "Hogar / Personal",
      Categoría: t.category?.name || "N/A",
      Cuenta: t.account.name,
      "Cuenta Destino": t.toAccount?.name || "N/A",
      Integrante: formatMemberName(t.member?.displayName),
      Monto: parseFloat(t.amount),
      Moneda: t.currency,
      Estado: t.status,
      Recurrente: t.isRecurring ? `Sí (${t.recurringFrequency})` : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");
    XLSX.writeFile(workbook, `Transacciones_ACHouse_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast.success("Archivo Excel exportado con éxito");
  };

  return (
    <>
      {showModal && (
        <TransactionModal
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSave={handleSaveTransaction}
          initialData={editingItem}
          categoriesList={categoriesList}
          accountsList={accountsList}
          membersList={membersList}
          businessesList={businessesList}
          currentMemberId={currentMemberId}
        />
      )}

      {/* Attachment Lightbox Modal */}
      {previewAttachment && (
        <div
          className="overlay"
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="card" style={{ maxWidth: 600, padding: "1.5rem", position: "relative" }}>
            <button
              className="btn btn-ghost btn-icon"
              style={{ position: "absolute", top: 12, right: 12 }}
              onClick={() => setPreviewAttachment(null)}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Comprobante Adjunto</h3>
            <img
              src={previewAttachment}
              alt="Comprobante"
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Transacciones</h1>
            <p className="page-subtitle">{filtered.length} transacciones registradas</p>
          </div>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button className="btn btn-secondary btn-sm" onClick={exportToExcel} title="Exportar a Excel">
              <FileSpreadsheet size={15} color="#22c55e" /> Exportar Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingItem(null); setShowModal(true); }}
            >
              <Plus size={16} /> Nueva Transacción
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { label: "Total Ingresos", value: fmt(totals.income), color: "var(--color-income)", bg: "var(--color-income-dim)", icon: ArrowUpCircle },
            { label: "Total Egresos", value: fmt(totals.expense), color: "var(--color-expense)", bg: "var(--color-expense-dim)", icon: ArrowDownCircle },
            {
              label: "Balance Neto",
              value: ((totals.income - totals.expense) >= 0 ? "+" : "") + fmt(totals.income - totals.expense),
              color: (totals.income - totals.expense) >= 0 ? "var(--color-income)" : "var(--color-expense)",
              bg: (totals.income - totals.expense) >= 0 ? "var(--color-income-dim)" : "var(--color-expense-dim)",
              icon: ArrowLeftRight
            },
          ].map(card => (
            <div key={card.label} className="card" style={{ background: card.bg, border: `1px solid var(--border-subtle)`, padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
                <card.icon size={16} color={card.color} />
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{card.label}</span>
              </div>
              <p style={{ fontSize: "1.375rem", fontWeight: 800, color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="input"
              placeholder="Buscar por descripción, categoría, cuenta..."
              style={{ paddingLeft: "2.5rem" }}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Type filters */}
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {["all", "income", "expense", "transfer"].map(t => (
              <button
                key={t}
                onClick={() => { setFilterType(t); setPage(1); }}
                className={`btn btn-sm ${filterType === t ? "btn-primary" : "btn-secondary"}`}
              >
                {t === "all" ? "Todos" : TYPE_CONFIG[t as keyof typeof TYPE_CONFIG]?.label ?? t}
              </button>
            ))}
          </div>

          {/* Date Presets */}
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {[
              { id: "all", label: "Todo el tiempo" },
              { id: "thisMonth", label: "Este mes" },
              { id: "today", label: "Hoy" },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => { setDatePreset(p.id as any); setPage(1); }}
                className={`btn btn-sm ${datePreset === p.id ? "btn-secondary" : "btn-ghost"}`}
                style={{ fontSize: "0.75rem", border: datePreset === p.id ? "1px solid var(--color-brand-400)" : "1px solid transparent" }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Business Filter */}
          {businessesList.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <Building2 size={14} style={{ color: "var(--text-muted)" }} />
              <select
                className="input"
                style={{ width: "auto", fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}
                value={filterBusiness}
                onChange={e => { setFilterBusiness(e.target.value); setPage(1); }}
              >
                <option value="all">Todas las empresas / hogar</option>
                <option value="none">Solo Hogar / Personal</option>
                {businessesList.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Table or Empty State */}
        {transactionsList.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">💸</div>
            <p className="empty-state-title">No hay transacciones registradas</p>
            <p className="empty-state-desc">Comienza registrando tus primeros ingresos, gastos o transferencias para ver el flujo en tiempo real.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingItem(null); setShowModal(true); }}>
              <Plus size={14} /> Registrar Primera Transacción
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Cuenta</th>
                  <th>Integrante</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th style={{ textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
                      No se encontraron transacciones con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                paginated.map(tx => {
                  const typeCfg = TYPE_CONFIG[tx.type];
                  const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.cleared;
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: typeCfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <typeCfg.Icon size={16} color={typeCfg.color} />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{tx.description}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            {tx.business && (
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: "0.6875rem",
                                background: "var(--color-investment-dim)",
                                color: "var(--color-investment)",
                                border: "1px solid var(--border-subtle)",
                                padding: "0.1rem 0.4rem",
                                borderRadius: 4,
                                fontWeight: 600
                              }}>
                                <Building2 size={10} /> {tx.business.name}
                              </span>
                            )}
                            {tx.isRecurring && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.6875rem", color: "var(--color-brand-300)" }}>
                                <Repeat size={10} /> {tx.recurringFrequency || "Recurrente"}
                              </span>
                            )}
                            {tx.attachmentUrl && (
                              <button
                                onClick={() => setPreviewAttachment(tx.attachmentUrl!)}
                                style={{ background: "transparent", border: "none", color: "var(--color-brand-400)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.6875rem", padding: 0 }}
                              >
                                <Paperclip size={10} /> Ver Recibo
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {tx.category ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: tx.category.color, flexShrink: 0 }} />
                            {tx.category.name}
                          </span>
                        ) : tx.type === "transfer" ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--color-warning)" }}>Transferencia</span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {tx.account.name}
                        {tx.toAccount && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>
                            → {tx.toAccount.name}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{formatMemberName(tx.member?.displayName)}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {format(tx.date, "dd MMM yyyy", { locale: es })}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: statusCfg.color, background: `${statusCfg.color}15`, padding: "0.2rem 0.5rem", borderRadius: 999 }}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: typeCfg.color }}>
                          {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                          {fmt(parseFloat(tx.amount), tx.currency || "DOP")}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Editar"
                            onClick={() => { setEditingItem(tx); setShowModal(true); }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Eliminar"
                            style={{ color: "#f87171" }}
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} de {filtered.length}
            </span>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              <button
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`btn btn-sm ${p === page ? "btn-primary" : "btn-secondary"}`}
                  style={{ minWidth: 34 }}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
