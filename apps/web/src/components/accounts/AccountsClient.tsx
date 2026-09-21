"use client";

import { useState, useEffect } from "react";
import { Plus, CreditCard, Wallet, PiggyBank, Banknote, Pencil, Trash2, X, Check, TrendingUp, TrendingDown, AlertCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { getAccounts, createAccount, updateAccount, deleteAccount } from "@/lib/actions/entities";
import { CURRENCIES, formatMoney } from "@/lib/geo";

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

const INITIAL_ACCOUNTS: AccountItem[] = [];

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
    currency: initialData?.currency ?? "DOP",
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
      balance: form.balance,
      currency: form.currency,
      isActive: true,
      creditLimit: type === "credit" ? form.creditLimit : undefined,
      statementDay: type === "credit" && form.statementDay ? parseInt(form.statementDay) : undefined,
      paymentDueDay: type === "credit" && form.paymentDueDay ? parseInt(form.paymentDueDay) : undefined,
      minimumPayment: type === "credit" ? form.minimumPayment : undefined,
    });
    onClose();
  };

  return (
    <div
      className="overlay"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ width: "min(500px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {initialData ? "Editar Cuenta" : "Nueva Cuenta / Tarjeta"}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Account Type Selector */}
            <div className="form-group">
              <label className="label">Tipo de Cuenta</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setType(k as any)}
                    className={`btn btn-sm ${type === k ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.75rem", padding: "0.5rem 0.25rem" }}
                  >
                    <v.icon size={13} /> {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Name */}
            <div className="form-group">
              <label className="label">Nombre de la Cuenta *</label>
              <input
                className="input"
                placeholder={
                  type === "checking" ? "Ej: Banco BHD / Banreservas / Nómina" :
                  type === "savings" ? "Ej: Fondo de Emergencia / Ahorros" :
                  "Ej: Visa Platinum / Mastercard"
                }
                value={form.name}
                onChange={e => set("name", e.target.value)}
                required
              />
            </div>

            {/* Balance & Currency */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label">Balance Inicial</label>
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
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol})
                    </option>
                  ))}
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
  const [accounts, setAccounts] = useState<AccountItem[]>(INITIAL_ACCOUNTS);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

  useEffect(() => {
    let active = true;
    getAccounts()
      .then((data) => {
        if (active && data) {
          setAccounts(
            data.map((a: any) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              balance: String(a.balance ?? "0"),
              currency: a.currency ?? "USD",
              isActive: a.isActive ?? true,
              creditLimit: a.creditLimit ? String(a.creditLimit) : null,
              availableCredit: a.availableCredit ? String(a.availableCredit) : null,
              statementDay: a.statementDay,
              paymentDueDay: a.paymentDueDay,
              minimumPayment: a.minimumPayment ? String(a.minimumPayment) : null,
            }))
          );
        }
      })
      .catch((err) => console.error("Error loading accounts:", err));
    return () => {
      active = false;
    };
  }, []);

  const fmt = (n: number | string, currency = "DOP") => {
    return formatMoney(n, currency);
  };

  const totalAssets = accounts
    .filter(a => parseFloat(a.balance) > 0)
    .reduce((s, a) => s + parseFloat(a.balance), 0);

  const totalDebt = accounts
    .filter(a => parseFloat(a.balance) < 0)
    .reduce((s, a) => s + Math.abs(parseFloat(a.balance)), 0);

  const handleSaveAccount = async (saved: Partial<AccountItem>) => {
    try {
      if (saved.id) {
        await updateAccount(saved.id, {
          name: saved.name,
          type: saved.type as any,
          balance: saved.balance !== undefined ? parseFloat(saved.balance) : undefined,
          currency: saved.currency,
          creditLimit: saved.creditLimit ? parseFloat(saved.creditLimit) : undefined,
          statementDay: saved.statementDay ? Number(saved.statementDay) : undefined,
          paymentDueDay: saved.paymentDueDay ? Number(saved.paymentDueDay) : undefined,
          minimumPayment: saved.minimumPayment ? parseFloat(saved.minimumPayment) : undefined,
        });
        setAccounts(prev => prev.map(a => a.id === saved.id ? { ...a, ...saved } as AccountItem : a));
        toast.success("Cuenta actualizada exitosamente");
      } else {
        const res = await createAccount({
          name: saved.name!,
          type: (saved.type as any) || "checking",
          balance: saved.balance ? parseFloat(saved.balance) : 0,
          currency: saved.currency || "USD",
          creditLimit: saved.creditLimit ? parseFloat(saved.creditLimit) : undefined,
          statementDay: saved.statementDay ? Number(saved.statementDay) : undefined,
          paymentDueDay: saved.paymentDueDay ? Number(saved.paymentDueDay) : undefined,
          minimumPayment: saved.minimumPayment ? parseFloat(saved.minimumPayment) : undefined,
        });
        const created = res.account;
        const newAcc: AccountItem = {
          id: created.id,
          name: created.name,
          type: created.type,
          balance: String(created.balance),
          currency: created.currency,
          isActive: true,
          creditLimit: created.creditLimit ? String(created.creditLimit) : null,
          availableCredit: created.availableCredit ? String(created.availableCredit) : null,
          statementDay: created.statementDay,
          paymentDueDay: created.paymentDueDay,
          minimumPayment: created.minimumPayment ? String(created.minimumPayment) : null,
        };
        setAccounts(prev => [newAcc, ...prev]);
        toast.success("Cuenta creada exitosamente");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar la cuenta");
    }
    setEditingAccount(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar la cuenta "${name}"?`)) {
      try {
        await deleteAccount(id);
        setAccounts(prev => prev.filter(a => a.id !== id));
        toast.info(`Cuenta "${name}" eliminada`);
      } catch (err: any) {
        toast.error(err?.message || "Error al eliminar la cuenta");
      }
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
