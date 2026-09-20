"use client";

import { useState, useMemo } from "react";
import {
  Plus, CreditCard, Banknote, User, Building2, Calendar, DollarSign,
  CheckCircle2, AlertCircle, ArrowRight, ArrowDownRight, Clock,
  FileSpreadsheet, ShieldAlert, Check, X, AlertTriangle, Wallet, Trash2
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/ToastContext";

// ─── Types & Demo Data ─────────────────────────────────────────────────────────
export interface LoanItem {
  id: string;
  name: string;
  lenderType: "bank" | "person" | "internal_member";
  lenderName?: string | null;
  borrowerName?: string | null;
  principalAmount: number;
  remainingBalance: number;
  interestRate: number; // percentage e.g. 8.5
  interestType: "fixed" | "variable" | "none";
  monthlyPayment: number;
  startDate: Date;
  endDate: Date;
  currency: string;
}

export interface CreditCardItem {
  id: string;
  name: string;
  balance: number; // current debt
  creditLimit: number;
  availableCredit: number;
  statementDay: number;
  paymentDueDay: number;
  minimumPayment: number;
  currency: string;
}

const INITIAL_LOANS: LoanItem[] = [];

const INITIAL_CARDS: CreditCardItem[] = [];

const PAYING_ACCOUNTS = [
  { id: "a1", name: "Cuenta Principal", balance: 0 },
];

// ─── Modal: Nuevo Préstamo ─────────────────────────────────────────────────────
function LoanModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (loan: Partial<LoanItem>) => void;
}) {
  const [name, setName] = useState("");
  const [lenderType, setLenderType] = useState<"bank" | "person" | "internal_member">("bank");
  const [lenderName, setLenderName] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("8.5");
  const [termMonths, setTermMonths] = useState("36");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const calculatedPayment = useMemo(() => {
    const p = parseFloat(principal);
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = parseInt(termMonths, 10);
    if (!p || !n) return 0;
    if (r === 0) return p / n;
    return (p * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  }, [principal, rate, termMonths]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !principal) return;

    const p = parseFloat(principal);
    const n = parseInt(termMonths, 10) || 12;
    const start = new Date(startDate);
    const end = addMonths(start, n);

    onSave({
      name,
      lenderType,
      lenderName: lenderType === "bank" || lenderType === "person" ? lenderName : "Ana M.",
      borrowerName: lenderType === "internal_member" ? borrowerName || "Carlos R." : null,
      principalAmount: p,
      remainingBalance: p,
      interestRate: parseFloat(rate) || 0,
      interestType: parseFloat(rate) > 0 ? "fixed" : "none",
      monthlyPayment: calculatedPayment,
      startDate: start,
      endDate: end,
      currency: "USD",
    });
    onClose();
  };

  return (
    <div className="overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(520px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Registrar Préstamo</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Nombre del préstamo *</label>
              <input className="input" required placeholder="Ej: Préstamo Auto, Préstamo Personal..." value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="label">Tipo de prestamista</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                {[
                  { id: "bank", label: "Banco", icon: Building2 },
                  { id: "person", label: "Externo / Persona", icon: User },
                  { id: "internal_member", label: "Préstamo Interno", icon: Wallet },
                ].map(t => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setLenderType(t.id as any)}
                    className={`btn btn-sm ${lenderType === t.id ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.75rem", padding: "0.5rem 0.25rem" }}
                  >
                    <t.icon size={13} /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {lenderType === "internal_member" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="label">Prestamista (Miembro)</label>
                  <select className="input" value={lenderName} onChange={e => setLenderName(e.target.value)}>
                    <option value="Ana M.">Ana M.</option>
                    <option value="Carlos R.">Carlos R.</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Prestatario (Miembro)</label>
                  <select className="input" value={borrowerName} onChange={e => setBorrowerName(e.target.value)}>
                    <option value="Carlos R.">Carlos R.</option>
                    <option value="Ana M.">Ana M.</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="label">Nombre de la entidad / prestamista</label>
                <input className="input" placeholder="Ej: BAC Credomatic, Familiar..." value={lenderName} onChange={e => setLenderName(e.target.value)} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label"><DollarSign size={12} style={{ display: "inline" }} />Monto Principal *</label>
                <input className="input" type="number" step="0.01" required placeholder="0.00" value={principal} onChange={e => setPrincipal(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Tasa de interés anual (%)</label>
                <input className="input" type="number" step="0.1" placeholder="0.0" value={rate} onChange={e => setRate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Plazo (Meses)</label>
                <input className="input" type="number" min="1" placeholder="36" value={termMonths} onChange={e => setTermMonths(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label"><Calendar size={12} style={{ display: "inline" }} />Fecha de inicio</label>
                <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
            </div>

            {calculatedPayment > 0 && (
              <div style={{ padding: "0.875rem", background: "var(--bg-active)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Cuota mensual estimada:</span>
                <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-income)" }}>
                  ${calculatedPayment.toFixed(2)} / mes
                </span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Check size={15} /> Guardar Préstamo</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Nueva Tarjeta de Crédito ──────────────────────────────────────────
function NewCardModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (card: Partial<CreditCardItem>) => void;
}) {
  const [name, setName] = useState("");
  const [creditLimit, setCreditLimit] = useState("5000");
  const [balance, setBalance] = useState("0");
  const [statementDay, setStatementDay] = useState("15");
  const [paymentDueDay, setPaymentDueDay] = useState("25");
  const [minimumPayment, setMinimumPayment] = useState("50");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const limit = parseFloat(creditLimit) || 0;
    const debt = parseFloat(balance) || 0;

    onSave({
      name: name.trim(),
      creditLimit: limit,
      balance: debt,
      availableCredit: Math.max(0, limit - debt),
      statementDay: parseInt(statementDay, 10) || 15,
      paymentDueDay: parseInt(paymentDueDay, 10) || 25,
      minimumPayment: parseFloat(minimumPayment) || 50,
      currency: "USD",
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
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Añadir Tarjeta de Crédito</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Nombre de la Tarjeta o Banco *</label>
              <input
                className="input"
                required
                placeholder="Ej: Visa Platinum BAC, Mastercard Oro..."
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label">
                  <DollarSign size={12} style={{ display: "inline" }} />
                  Límite de Crédito *
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  required
                  placeholder="5000.00"
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Deuda Actual / Saldo al corte</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="label">
                  <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
                  Día de Corte (1-31)
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="15"
                  value={statementDay}
                  onChange={e => setStatementDay(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">
                  <AlertCircle size={12} style={{ display: "inline", marginRight: 4 }} />
                  Fecha Límite de Pago (Día)
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="25"
                  value={paymentDueDay}
                  onChange={e => setPaymentDueDay(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Pago Mínimo Estimado ($)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="50.00"
                value={minimumPayment}
                onChange={e => setMinimumPayment(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> Guardar Tarjeta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Pagar Cuota de Préstamo ───────────────────────────────────────────
function PayLoanModal({
  loan,
  onClose,
  onPay,
}: {
  loan: LoanItem;
  onClose: () => void;
  onPay: (loanId: string, amount: number, accountId: string) => void;
}) {
  const [amount, setAmount] = useState(String(loan.monthlyPayment.toFixed(2)));
  const [accountId, setAccountId] = useState("a1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onPay(loan.id, num, accountId);
    onClose();
  };

  return (
    <div className="overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(460px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Registrar Pago: {loan.name}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Cuenta de débito</label>
              <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                {PAYING_ACCOUNTS.map(a => (
                  <option key={a.id} value={a.id}>{a.name} (Saldo: ${a.balance.toLocaleString()})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Monto del abono</label>
              <input
                className="input"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Saldo actual adeudado: <strong>${loan.remainingBalance.toLocaleString()}</strong>.
              Este pago se descontará de la deuda y generará automáticamente un egreso en la cuenta seleccionada.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Check size={15} /> Confirmar Pago</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Pagar Tarjeta de Crédito ──────────────────────────────────────────
function PayCardModal({
  card,
  onClose,
  onPay,
}: {
  card: CreditCardItem;
  onClose: () => void;
  onPay: (cardId: string, amount: number, accountId: string) => void;
}) {
  const [payType, setPayType] = useState<"total" | "minimum" | "custom">("total");
  const [customAmount, setCustomAmount] = useState("");
  const [accountId, setAccountId] = useState("a1");

  const finalAmount = payType === "total" ? card.balance : payType === "minimum" ? card.minimumPayment : parseFloat(customAmount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finalAmount <= 0) return;
    onPay(card.id, finalAmount, accountId);
    onClose();
  };

  return (
    <div className="overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(480px, 95vw)" }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Pagar Tarjeta: {card.name}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="label">Cuenta de origen</label>
              <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                {PAYING_ACCOUNTS.map(a => (
                  <option key={a.id} value={a.id}>{a.name} (Saldo: ${a.balance.toLocaleString()})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Monto a abonar</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setPayType("total")}
                  className={`btn btn-sm ${payType === "total" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.75rem" }}
                >
                  Saldo al corte (${card.balance.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setPayType("minimum")}
                  className={`btn btn-sm ${payType === "minimum" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.75rem" }}
                >
                  Mínimo (${card.minimumPayment.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setPayType("custom")}
                  className={`btn btn-sm ${payType === "custom" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.75rem" }}
                >
                  Otro monto
                </button>
              </div>
            </div>

            {payType === "custom" && (
              <div className="form-group">
                <label className="label">Monto personalizado ($)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> Pagar ${finalAmount.toFixed(2)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Amortization Table View Component ────────────────────────────────────────
function AmortizationTableModal({
  loan,
  onClose,
}: {
  loan: LoanItem;
  onClose: () => void;
}) {
  const schedule = useMemo(() => {
    const list = [];
    let balance = loan.principalAmount;
    const monthlyRate = (loan.interestRate || 0) / 100 / 12;
    const payment = loan.monthlyPayment;

    for (let i = 1; i <= 24 && balance > 0.01; i++) {
      const interest = balance * monthlyRate;
      const principalPaid = Math.min(balance, payment - interest);
      balance = Math.max(0, balance - principalPaid);
      const dueDate = addMonths(loan.startDate, i);

      list.push({
        installment: i,
        date: dueDate,
        payment,
        principalPaid,
        interest,
        remainingBalance: balance,
      });
    }
    return list;
  }, [loan]);

  return (
    <div className="overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(680px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Tabla de Amortización: {loan.name}</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Principal: ${loan.principalAmount.toLocaleString()} · Tasa: {loan.interestRate}% anual
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ overflowY: "auto", padding: 0 }}>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Cuota</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: "right" }}>Pago Total</th>
                  <th style={{ textAlign: "right" }}>Capital</th>
                  <th style={{ textAlign: "right" }}>Interés</th>
                  <th style={{ textAlign: "right" }}>Saldo Restante</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(row => (
                  <tr key={row.installment}>
                    <td style={{ fontWeight: 600 }}>#{row.installment}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {format(row.date, "dd MMM yyyy", { locale: es })}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>${row.payment.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "var(--color-income)" }}>${row.principalPaid.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "var(--color-expense)" }}>${row.interest.toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>${row.remainingBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function LoansClient() {
  const toast = useToast();
  const [tab, setTab] = useState<"loans" | "cards">("loans");
  const [loans, setLoans] = useState<LoanItem[]>(INITIAL_LOANS);
  const [cards, setCards] = useState<CreditCardItem[]>(INITIAL_CARDS);
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [payingLoan, setPayingLoan] = useState<LoanItem | null>(null);
  const [payingCard, setPayingCard] = useState<CreditCardItem | null>(null);
  const [amortizationLoan, setAmortizationLoan] = useState<LoanItem | null>(null);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const totalLoanDebt = loans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalCardDebt = cards.reduce((sum, c) => sum + c.balance, 0);
  const totalCombinedDebt = totalLoanDebt + totalCardDebt;

  const handleSaveLoan = (newLoan: Partial<LoanItem>) => {
    const item: LoanItem = {
      id: String(Date.now()),
      name: newLoan.name!,
      lenderType: newLoan.lenderType!,
      lenderName: newLoan.lenderName || null,
      borrowerName: newLoan.borrowerName || null,
      principalAmount: newLoan.principalAmount || 0,
      remainingBalance: newLoan.remainingBalance || newLoan.principalAmount || 0,
      interestRate: newLoan.interestRate || 0,
      interestType: newLoan.interestType || "fixed",
      monthlyPayment: newLoan.monthlyPayment || 0,
      startDate: newLoan.startDate || new Date(),
      endDate: newLoan.endDate || new Date(),
      currency: "USD",
    };
    setLoans(prev => [item, ...prev]);
    toast.success("Préstamo registrado exitosamente");
  };

  const handleSaveCard = (newCard: Partial<CreditCardItem>) => {
    const item: CreditCardItem = {
      id: `c_${Date.now()}`,
      name: newCard.name!,
      balance: newCard.balance ?? 0,
      creditLimit: newCard.creditLimit ?? 5000,
      availableCredit: newCard.availableCredit ?? 5000,
      statementDay: newCard.statementDay ?? 15,
      paymentDueDay: newCard.paymentDueDay ?? 25,
      minimumPayment: newCard.minimumPayment ?? 50,
      currency: "USD",
    };
    setCards(prev => [item, ...prev]);
    toast.success(`Tarjeta "${item.name}" añadida exitosamente`);
  };

  const handlePayLoan = (loanId: string, amount: number) => {
    setLoans(prev =>
      prev.map(l => {
        if (l.id === loanId) {
          const newRemaining = Math.max(0, l.remainingBalance - amount);
          return { ...l, remainingBalance: newRemaining };
        }
        return l;
      })
    );
    toast.success(`Abono de $${amount.toFixed(2)} registrado al préstamo`);
  };

  const handlePayCard = (cardId: string, amount: number) => {
    setCards(prev =>
      prev.map(c => {
        if (c.id === cardId) {
          const newBal = Math.max(0, c.balance - amount);
          const newAvail = Math.min(c.creditLimit, c.availableCredit + amount);
          return { ...c, balance: newBal, availableCredit: newAvail };
        }
        return c;
      })
    );
    toast.success(`Pago de $${amount.toFixed(2)} aplicado a la tarjeta`);
  };

  const handleDeleteLoan = (loanId: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el préstamo "${name}"?`)) {
      setLoans(prev => prev.filter(l => l.id !== loanId));
      toast.info(`Préstamo "${name}" eliminado`);
    }
  };

  const handleDeleteCard = (cardId: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar la tarjeta "${name}"?`)) {
      setCards(prev => prev.filter(c => c.id !== cardId));
      toast.info(`Tarjeta "${name}" eliminada`);
    }
  };

  return (
    <>
      {showNewLoanModal && <LoanModal onClose={() => setShowNewLoanModal(false)} onSave={handleSaveLoan} />}
      {showNewCardModal && <NewCardModal onClose={() => setShowNewCardModal(false)} onSave={handleSaveCard} />}
      {payingLoan && <PayLoanModal loan={payingLoan} onClose={() => setPayingLoan(null)} onPay={handlePayLoan} />}
      {payingCard && <PayCardModal card={payingCard} onClose={() => setPayingCard(null)} onPay={handlePayCard} />}
      {amortizationLoan && <AmortizationTableModal loan={amortizationLoan} onClose={() => setAmortizationLoan(null)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Tarjetas y Préstamos</h1>
            <p className="page-subtitle">Control de amortizaciones, fechas límite y límites crediticios</p>
          </div>
          
          {/* Dynamic Button based on active Tab */}
          {tab === "loans" ? (
            <button className="btn btn-primary" onClick={() => setShowNewLoanModal(true)}>
              <Plus size={16} /> Registrar Préstamo
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowNewCardModal(true)}>
              <Plus size={16} /> Añadir Tarjeta de Crédito
            </button>
          )}
        </div>

        {/* Global Debt Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Deuda Total en Préstamos</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-expense)" }}>{fmt(totalLoanDebt)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Saldos en Tarjetas</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-warning)" }}>{fmt(totalCardDebt)}</p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Pasivo Total Combinado</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-expense)" }}>{fmt(totalCombinedDebt)}</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
          <button
            onClick={() => setTab("loans")}
            className={`btn ${tab === "loans" ? "btn-primary" : "btn-ghost"}`}
          >
            <Banknote size={16} /> Préstamos y Deudas ({loans.length})
          </button>
          <button
            onClick={() => setTab("cards")}
            className={`btn ${tab === "cards" ? "btn-primary" : "btn-ghost"}`}
          >
            <CreditCard size={16} /> Tarjetas de Crédito ({cards.length})
          </button>
        </div>

        {/* Tab 1: Loans */}
        {tab === "loans" && (
          loans.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">🏦</div>
              <p className="empty-state-title">No hay préstamos registrados</p>
              <p className="empty-state-desc">Registra tus préstamos bancarios o deudas entre integrantes para seguir su amortización.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewLoanModal(true)}>
                <Plus size={14} /> Registrar Primer Préstamo
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
              {loans.map(loan => {
                const paid = loan.principalAmount - loan.remainingBalance;
                const pct = (paid / loan.principalAmount) * 100;

                return (
                  <div key={loan.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{loan.name}</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {loan.lenderType === "internal_member"
                            ? `De ${loan.lenderName} a ${loan.borrowerName}`
                            : loan.lenderName || "Préstamo"}
                        </p>
                      </div>
                      <span className="badge" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        {loan.interestRate > 0 ? `${loan.interestRate}% anual` : "Sin interés"}
                      </span>
                    </div>

                    {/* Progress */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Pagado: <strong style={{ color: "var(--text-primary)" }}>{fmt(paid)}</strong></span>
                        <span style={{ fontWeight: 700, color: "var(--color-expense)" }}>Resta: {fmt(loan.remainingBalance)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #16a34a 0%, var(--color-income) 100%)" }} />
                      </div>
                    </div>

                    {/* Monthly payment indicator & Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid var(--border-hair)" }}>
                      <div>
                        <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Cuota Mensual</p>
                        <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>{fmt(loan.monthlyPayment)}</p>
                      </div>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAmortizationLoan(loan)}
                        >
                          <FileSpreadsheet size={13} /> Tabla
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setPayingLoan(loan)}
                        >
                          Pagar Cuota
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: "var(--color-expense)" }}
                          onClick={() => handleDeleteLoan(loan.id, loan.name)}
                          title="Eliminar préstamo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tab 2: Credit Cards */}
        {tab === "cards" && (
          cards.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">💳</div>
              <p className="empty-state-title">No hay tarjetas de crédito registradas</p>
              <p className="empty-state-desc">Añade tus tarjetas para controlar límites, fechas de corte y pagos mínimos.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewCardModal(true)}>
                <Plus size={14} /> Añadir Primera Tarjeta
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
              {cards.map(card => {
                const utilPct = card.creditLimit > 0 ? (card.balance / card.creditLimit) * 100 : 0;
                const isHighUtil = utilPct > 50;

                return (
                  <div key={card.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: 42, height: 42, borderRadius: "var(--radius-lg)", background: "var(--color-warning-dim)", color: "var(--color-warning)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{card.name}</h3>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Límite: {fmt(card.creditLimit)}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setPayingCard(card)}>
                          Pagar Tarjeta
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: "var(--color-expense)" }}
                          onClick={() => handleDeleteCard(card.id, card.name)}
                          title="Eliminar tarjeta"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Utilization bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Deuda actual: <strong style={{ color: "var(--color-expense)" }}>{fmt(card.balance)}</strong></span>
                        <span style={{ fontWeight: 700, color: isHighUtil ? "var(--color-expense)" : "var(--text-secondary)" }}>
                          {utilPct.toFixed(0)}% utilizado
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(100, utilPct)}%`, background: isHighUtil ? "linear-gradient(90deg, var(--color-warning), var(--color-expense))" : "linear-gradient(90deg, var(--accent-dim), var(--accent))" }} />
                      </div>
                    </div>

                    {/* Payment alerts */}
                    <div style={{ background: "var(--bg-active)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13} color="var(--color-warning)" />
                        <span style={{ color: "var(--text-secondary)" }}>Día de corte: <strong style={{ color: "var(--text-primary)" }}>{card.statementDay}</strong></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={13} color="var(--color-expense)" />
                        <span style={{ color: "var(--text-secondary)" }}>Pago límite: <strong style={{ color: "var(--color-expense)" }}>Día {card.paymentDueDay}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </>
  );
}
