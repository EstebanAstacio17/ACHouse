"use client";

import { useState } from "react";
import { Plus, CreditCard, Wallet, PiggyBank, Banknote, Pencil, Trash2, X, Check, TrendingUp, TrendingDown, AlertCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";

export interface AccountItem {
  id: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
  isActive: boolean;
  creditLimit?: string | null;
  availableCredit?: string | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
  minimumPayment?: string | null;
}

const ACCOUNT_TYPES = {
  checking: { label: "Cuenta Corriente", icon: Wallet, color: "var(--accent)", bg: "var(--accent-subtle)" },
  savings: { label: "Ahorros", icon: PiggyBank, color: "var(--color-income)", bg: "var(--color-income-dim)" },
  credit: { label: "Tarjeta de Crédito", icon: CreditCard, color: "var(--color-warning)", bg: "var(--color-warning-dim)" },
  cash: { label: "Efectivo", icon: Banknote, color: "var(--color-investment)", bg: "var(--color-investment-dim)" },
};

const DEMO_ACCOUNTS: AccountItem[] = [];

function AccountModal({
  onClose,
  onSave,
  initialData,
}: {
  onClose: () => void;
  onSave: (acc: Partial<AccountItem>) => void;
  initialData?: AccountItem | null;
}) {
  const [type, setType] = useState(initialData?.type ?? "checking");
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    balance: initialData?.balance ?? "0",
    currency: initialData?.currency ?? "USD",
    creditLimit: initialData?.creditLimit ?? "",
    statementDay: initialData?.statementDay ? String(initialData.statementDay) : "",
    paymentDueDay: initialData?.paymentDueDay ? String(initialData.paymentDueDay) : "",
    minimumPayment: initialData?.minimumPayment ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    onSave({
      id: initialData?.id,
      name: form.name.trim(),
      type,
      balance: form.balance || "0",
      currency: form.currency,
      isActive: true,
      creditLimit: type === "credit" ? form.creditLimit || null : null,
      availableCredit: type === "credit" ? String(Math.max(0, parseFloat(form.creditLimit || "0") - Math.abs(parseFloat(form.balance || "0")))) : null,
      statementDay: type === "credit" && form.statementDay ? parseInt(form.statementDay) : null,
      paymentDueDay: type === "credit" && form.paymentDueDay ? parseInt(form.paymentDueDay) : null,
      minimumPayment: type === "credit" ? form.minimumPayment || null : null,
    });
    onClose();
  };

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {initialData ? "Editar Cuenta" : "Nueva Cuenta"}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Type */}
            <div>
              <label className="label">Tipo de cuenta</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {Object.entries(ACCOUNT_TYPES).map(([key, cfg]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setType(key)}
                    style={{
                      padding: "0.625rem 0.875rem",
                      borderRadius: "var(--radius-md)",
                      border: `1.5px solid ${type === key ? cfg.color : "var(--border-default)"}`,
                      background: type === key ? cfg.bg : "transparent",
                      color: type === key ? cfg.color : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                  >
                    <cfg.icon size={15} /> {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Nombre de la cuenta *</label>
              <input
                className="input"
                required
                placeholder="Ej: BAC Cuenta Corriente, Tarjeta Visa..."
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label">Saldo actual / Saldo inicial</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.balance}
                  onChange={e => set("balance", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Moneda</label>
                <select className="input" value={form.currency} onChange={e => set("currency", e.target.value)}>
                  <option value="USD">USD ($)</option>
                  <option value="HNL">HNL (L)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GTQ">GTQ (Q)</option>
                  <option value="COP">COP ($)</option>
                </select>
              </div>
            </div>

            {type === "credit" && (
              <>
                <div className="divider" />
                <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Configuración de Tarjeta de Crédito
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="label">Límite de crédito</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="10000.00"
                      value={form.creditLimit}
                      onChange={e => set("creditLimit", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Pago mínimo</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="50.00"
                      value={form.minimumPayment}
                      onChange={e => set("minimumPayment", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Día de corte</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="15"
                      value={form.statementDay}
                      onChange={e => set("statementDay", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Fecha límite de pago</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="25"
                      value={form.paymentDueDay}
                      onChange={e => set("paymentDueDay", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> {initialData ? "Actualizar Cuenta" : "Guardar Cuenta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccountsClient() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<AccountItem[]>(DEMO_ACCOUNTS);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

  const fmt = (n: number | string, currency = "USD") =>
    parseFloat(String(n)).toLocaleString("en-US", { style: "currency", currency });

  const totalAssets = accounts
    .filter(a => parseFloat(a.balance) > 0)
    .reduce((s, a) => s + parseFloat(a.balance), 0);

  const totalDebt = accounts
    .filter(a => parseFloat(a.balance) < 0)
    .reduce((s, a) => s + Math.abs(parseFloat(a.balance)), 0);

  const handleSaveAccount = (saved: Partial<AccountItem>) => {
    if (saved.id) {
      setAccounts(prev => prev.map(a => a.id === saved.id ? { ...a, ...saved } as AccountItem : a));
      toast.success("Cuenta actualizada exitosamente");
    } else {
      const newAcc: AccountItem = {
        id: String(Date.now()),
        name: saved.name!,
        type: saved.type!,
        balance: saved.balance || "0",
        currency: saved.currency || "USD",
        isActive: true,
        creditLimit: saved.creditLimit,
        availableCredit: saved.availableCredit,
        statementDay: saved.statementDay,
        paymentDueDay: saved.paymentDueDay,
        minimumPayment: saved.minimumPayment,
      };
      setAccounts(prev => [newAcc, ...prev]);
      toast.success("Cuenta creada exitosamente");
    }
    setEditingAccount(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar la cuenta "${name}"?`)) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.info(`Cuenta "${name}" eliminada`);
    }
  };

  return (
    <>
      {showModal && (
        <AccountModal
          onClose={() => { setShowModal(false); setEditingAccount(null); }}
          onSave={handleSaveAccount}
          initialData={editingAccount}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Cuentas y Tarjetas</h1>
            <p className="page-subtitle">Control de liquidez, cuentas de ahorro y tarjetas de crédito</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingAccount(null); setShowModal(true); }}
          >
            <Plus size={16} /> Nueva Cuenta
          </button>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Total Activos / Liquidez", value: fmt(totalAssets), color: "var(--color-income)", Icon: TrendingUp },
            { label: "Total Deuda en Tarjetas", value: fmt(totalDebt), color: "var(--color-expense)", Icon: TrendingDown },
            { label: "Patrimonio Neto en Cuentas", value: fmt(totalAssets - totalDebt), color: "var(--accent)", Icon: Wallet },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>{s.label}</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--bg-active)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.Icon size={18} color={s.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">💳</div>
            <p className="empty-state-title">No hay cuentas registradas</p>
            <p className="empty-state-desc">Añade tu primera cuenta corriente, de ahorros o tarjeta de crédito para empezar a gestionar tus finanzas.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Crear Primera Cuenta
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {accounts.map(acc => {
              const cfg = ACCOUNT_TYPES[acc.type as keyof typeof ACCOUNT_TYPES] || ACCOUNT_TYPES.checking;
              const balance = parseFloat(acc.balance);
              const isNegative = balance < 0;
              return (
                <div key={acc.id} className="card" style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  {/* Card bg accent */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 100,
                      height: 100,
                      background: `radial-gradient(circle, ${cfg.color}25 0%, transparent 70%)`,
                      transform: "translate(25%, -25%)",
                      pointerEvents: "none",
                    }}
                  />

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: 42, height: 42, borderRadius: "var(--radius-lg)", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <cfg.icon size={20} color={cfg.color} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{acc.name}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{cfg.label}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => { setEditingAccount(acc); setShowModal(true); }}
                          title="Editar cuenta"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: "var(--color-expense)" }}
                          onClick={() => handleDelete(acc.id, acc.name)}
                          title="Eliminar cuenta"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: "0.25rem" }}>Saldo Actual</p>
                      <p style={{ fontSize: "1.75rem", fontWeight: 800, color: isNegative ? "var(--color-expense)" : "var(--text-primary)", letterSpacing: "-0.03em" }}>
                        {fmt(Math.abs(balance), acc.currency)}
                        {isNegative && <span style={{ fontSize: "0.75rem", color: "var(--color-expense)", marginLeft: 6, fontWeight: 600 }}>deuda</span>}
                      </p>
                    </div>

                    {acc.type === "credit" && acc.creditLimit && (
                      <div style={{ background: "var(--bg-active)", padding: "0.75rem", borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Crédito Disponible</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
                            {fmt(parseFloat(acc.availableCredit ?? "0"))} / {fmt(parseFloat(acc.creditLimit))}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(100, Math.max(0, (parseFloat(acc.availableCredit ?? "0") / parseFloat(acc.creditLimit)) * 100))}%`,
                              background: `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color}cc 100%)`,
                            }}
                          />
                        </div>
                        {acc.paymentDueDay && (
                          <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <AlertCircle size={12} color="var(--color-warning)" />
                            <span style={{ fontSize: "0.73rem", color: "var(--text-secondary)" }}>
                              Corte: día {acc.statementDay ?? 15} · Pago límite: día {acc.paymentDueDay} (Mín. {fmt(parseFloat(acc.minimumPayment ?? "0"))})
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-hair)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Moneda: {acc.currency}</span>
                    <span style={{ fontSize: "0.73rem", fontWeight: 600, color: "var(--color-income)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-income)", display: "inline-block" }} /> Activa
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
