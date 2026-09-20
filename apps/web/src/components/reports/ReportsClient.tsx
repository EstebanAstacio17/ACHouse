"use client";

import { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet, FileText, Download, Calendar, DollarSign,
  TrendingUp, TrendingDown, ArrowUpDown, PiggyBank, Check, AlertCircle,
  RefreshCw, CheckCircle2, Building2, User, Filter
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/ToastContext";
import { getTransactions } from "@/lib/actions/transactions";
import { getAccounts } from "@/lib/actions/entities";

const PAST_RECONCILIATIONS: Array<{ id: string; accountName: string; date: Date; expected: number; actual: number; diff: number; status: string }> = [];

export function ReportsClient() {
  const toast = useToast();
  const [tab, setTab] = useState<"reports" | "reconciliation">("reports");
  const [timeframe, setTimeframe] = useState<"month" | "quarter" | "year">("month");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reconciliation State
  const [selectedAccId, setSelectedAccId] = useState("");
  const [statementBalance, setStatementBalance] = useState("0");
  const [reconDate, setReconDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reconNotes, setReconNotes] = useState("");
  const [reconciliations, setReconciliations] = useState(PAST_RECONCILIATIONS);
  const [reconSuccess, setReconSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [txs, accs] = await Promise.all([
          getTransactions({ perPage: 100 }),
          getAccounts(),
        ]);
        setTransactions(txs);
        setAccounts(accs);
        if (accs.length > 0) {
          setSelectedAccId(accs[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const reconciliationAccounts = useMemo(() => {
    return accounts.map(a => ({
      id: a.id,
      name: a.name,
      expectedBalance: parseFloat(a.balance ?? "0"),
      currency: a.currency ?? "USD",
    }));
  }, [accounts]);

  const activeReconAccount = reconciliationAccounts.find(a => a.id === selectedAccId) || reconciliationAccounts[0] || {
    id: "none",
    name: "Sin cuentas",
    expectedBalance: 0,
    currency: "DOP",
  };

  const reportCurrency = accounts[0]?.currency || "DOP";
  const reconDifference = parseFloat(statementBalance || "0") - activeReconAccount.expectedBalance;
  const isMatched = Math.abs(reconDifference) < 0.01;

  const fmt = (n: number, curr = reportCurrency) => {
    try {
      return n.toLocaleString("es-DO", { style: "currency", currency: curr });
    } catch {
      return `${curr} ${n.toFixed(2)}`;
    }
  };

  const totalIncome = useMemo(() => {
    return transactions.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  }, [transactions]);

  const netFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netFlow / totalIncome) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const expenses = transactions.filter(t => t.type === "expense");
    const catMap = new Map<string, { amount: number; color: string }>();

    expenses.forEach(t => {
      const name = t.category?.name || "Otros Gastos";
      const color = t.category?.color || "#64748b";
      const amt = parseFloat(t.amount || "0");
      const existing = catMap.get(name) || { amount: 0, color };
      catMap.set(name, { amount: existing.amount + amt, color });
    });

    const total = Array.from(catMap.values()).reduce((s, c) => s + c.amount, 0);

    return Array.from(catMap.entries()).map(([category, info]) => ({
      category,
      amount: info.amount,
      percentage: total > 0 ? Math.round((info.amount / total) * 100) : 0,
      color: info.color,
    })).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const monthlySeries = useMemo(() => {
    const monthMap = new Map<string, { ingresos: number; egresos: number }>();

    transactions.forEach(t => {
      const monthKey = format(new Date(t.date), "MMM yyyy", { locale: es });
      const current = monthMap.get(monthKey) || { ingresos: 0, egresos: 0 };
      const amt = parseFloat(t.amount || "0");
      if (t.type === "income") current.ingresos += amt;
      if (t.type === "expense") current.egresos += amt;
      monthMap.set(monthKey, current);
    });

    let runningPatrimonio = accounts.reduce((s, a) => s + parseFloat(a.balance ?? "0"), 0);

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      ingresos: data.ingresos,
      egresos: data.egresos,
      flujo: data.ingresos - data.egresos,
      patrimonio: runningPatrimonio,
    }));
  }, [transactions, accounts]);

  // Export to Excel
  const exportExcel = () => {
    const data = categoryBreakdown.map(c => ({
      Categoría: c.category,
      Monto: c.amount,
      Porcentaje: `${c.percentage}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ Info: "Sin gastos registrados" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos por Categoría");
    XLSX.writeFile(wb, `Reporte_Financiero_ACHouse_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Reporte en Excel descargado exitosamente");
  };

  // Export to PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("ACHouse — Reporte Financiero Consolidado", 14, 20);

    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 14, 28);
    doc.text(`Hogar: ACHouse · Moneda: ${reportCurrency}`, 14, 34);

    // Summary block
    doc.setFontSize(12);
    doc.text("Resumen General", 14, 46);
    doc.setFontSize(10);
    doc.text(`Total Ingresos: ${fmt(totalIncome)}`, 14, 54);
    doc.text(`Total Egresos: ${fmt(totalExpense)}`, 14, 60);
    doc.text(`Flujo Neto: ${netFlow >= 0 ? "+" : ""}${fmt(netFlow)}`, 14, 66);
    doc.text(`Tasa de Ahorro: ${savingsRate.toFixed(1)}%`, 14, 72);

    // Table
    autoTable(doc, {
      startY: 80,
      head: [["Categoría", `Monto (${reportCurrency})`, "Distribución %"]],
      body: categoryBreakdown.length > 0
        ? categoryBreakdown.map(c => [c.category, fmt(c.amount), `${c.percentage}%`])
        : [["Sin datos", "$0.00", "0%"]],
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`Reporte_ACHouse_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("Reporte en PDF generado exitosamente");
  };

  const handleSaveReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: String(Date.now()),
      accountName: activeReconAccount.name,
      date: new Date(reconDate),
      expected: activeReconAccount.expectedBalance,
      actual: parseFloat(statementBalance),
      diff: reconDifference,
      status: isMatched ? "matched" : "adjusted",
    };
    setReconciliations(prev => [newEntry, ...prev]);
    setReconSuccess(true);
    toast.success("Conciliación bancaria guardada en el historial");
    setTimeout(() => setReconSuccess(false), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Reportes y Conciliación</h1>
          <p className="page-subtitle">P&L consolidado, conciliación bancaria y exportación en PDF/Excel</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary btn-sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} color="#22c55e" /> Exportar Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportPDF}>
            <FileText size={15} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setTab("reports")}
          className={`btn ${tab === "reports" ? "btn-primary" : "btn-ghost"}`}
        >
          <TrendingUp size={16} /> Reportes Financieros
        </button>
        <button
          onClick={() => setTab("reconciliation")}
          className={`btn ${tab === "reconciliation" ? "btn-primary" : "btn-ghost"}`}
        >
          <CheckCircle2 size={16} /> Módulo de Conciliación Bancaria
        </button>
      </div>

      {/* Tab 1: Financial Reports */}
      {tab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Ingresos Totales</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-income)" }}>${totalIncome.toLocaleString()}</p>
            </div>
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Gastos Totales</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-expense)" }}>${totalExpense.toLocaleString()}</p>
            </div>
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Flujo Neto</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: netFlow >= 0 ? "var(--color-income)" : "var(--color-expense)" }}>
                {netFlow >= 0 ? "+" : ""}${netFlow.toLocaleString()}
              </p>
            </div>
            <div className="card" style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Tasa de Ahorro</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{savingsRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Area Chart: Net Worth Trend */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Evolución de Ingresos, Egresos y Patrimonio Neto
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Histórico consolidado
            </p>
            <div style={{ width: "100%", height: 300 }}>
              {monthlySeries.length === 0 ? (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", gap: "0.5rem" }}>
                  <TrendingUp size={32} style={{ opacity: 0.3 }} />
                  <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>Sin historial de movimientos suficiente</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>El gráfico se generará de forma automática al registrar transacciones.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hair)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                    <YAxis tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} tickFormatter={v => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 8, color: "var(--text-primary)" }}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 15 }} />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="var(--color-income)" fillOpacity={1} fill="url(#colorIngresos)" strokeWidth={2} />
                    <Area type="monotone" dataKey="egresos" name="Egresos" stroke="var(--color-expense)" fillOpacity={1} fill="url(#colorEgresos)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Desglose de Gastos por Categoría</h3>
            </div>
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Participación</th>
                    <th style={{ textAlign: "right" }}>Gasto Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
                        No hay gastos clasificados por categoría en este periodo.
                      </td>
                    </tr>
                  ) : (
                    categoryBreakdown.map(c => (
                      <tr key={c.category}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color }} />
                            {c.category}
                          </span>
                        </td>
                        <td style={{ width: "40%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div className="progress-bar" style={{ flex: 1, height: 7 }}>
                              <div className="progress-fill" style={{ width: `${c.percentage}%`, background: c.color }} />
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", width: 45 }}>{c.percentage}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>${c.amount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bank Reconciliation */}
      {tab === "reconciliation" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Reconciliation Form */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>Nueva Conciliación Bancaria</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Compara el saldo del sistema con el extracto bancario oficial para garantizar exactitud contable.
            </p>

            <form onSubmit={handleSaveReconciliation} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="label">Cuenta a conciliar</label>
                <select
                  className="input"
                  value={selectedAccId}
                  onChange={e => {
                    setSelectedAccId(e.target.value);
                    const acc = reconciliationAccounts.find(a => a.id === e.target.value);
                    if (acc) setStatementBalance(String(acc.expectedBalance));
                  }}
                >
                  {reconciliationAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="label">Saldo en Sistema (Calculado)</label>
                  <input
                    className="input"
                    disabled
                    value={`$${activeReconAccount.expectedBalance.toLocaleString()}`}
                    style={{ background: "var(--surface-3)", color: "var(--text-muted)", fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Saldo Extracto Bancario *</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    required
                    value={statementBalance}
                    onChange={e => setStatementBalance(e.target.value)}
                    style={{ fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Difference calculation badge */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  background: isMatched ? "var(--color-income-dim)" : "var(--color-expense-dim)",
                  border: `1px solid ${isMatched ? "var(--color-income-dim)" : "var(--color-expense-dim)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isMatched ? <CheckCircle2 size={18} color="var(--color-income)" /> : <AlertCircle size={18} color="var(--color-expense)" />}
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: isMatched ? "var(--color-income)" : "var(--color-expense)" }}>
                    {isMatched ? "Saldo Cuadrado Perfecto" : `Diferencia de Descuadre`}
                  </span>
                </div>
                <span style={{ fontSize: "1.125rem", fontWeight: 800, color: isMatched ? "var(--color-income)" : "var(--color-expense)" }}>
                  {isMatched ? "$0.00" : `${reconDifference >= 0 ? "+" : ""}$${reconDifference.toFixed(2)}`}
                </span>
              </div>

              <div className="form-group">
                <label className="label">Fecha del extracto</label>
                <input className="input" type="date" value={reconDate} onChange={e => setReconDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Notas / Observaciones</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Notas de conciliación mensual..."
                  value={reconNotes}
                  onChange={e => setReconNotes(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                <Check size={16} /> Guardar Registro de Conciliación
              </button>

              {reconSuccess && (
                <p style={{ color: "var(--color-income)", fontSize: "0.8125rem", textAlign: "center" }}>
                  ¡Conciliación registrada exitosamente!
                </p>
              )}
            </form>
          </div>

          {/* Past Reconciliations History */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>Historial de Conciliaciones</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {reconciliations.length === 0 ? (
                <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                  <CheckCircle2 size={24} style={{ margin: "0 auto 0.5rem", opacity: 0.3 }} />
                  No hay conciliaciones registradas aún en el historial.
                </div>
              ) : (
                reconciliations.map(r => (
                  <div
                    key={r.id}
                    style={{
                      padding: "0.875rem",
                      background: "var(--bg-card-alt)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{r.accountName}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {format(r.date, "dd MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: r.status === "matched" ? "var(--color-income)" : "var(--color-warning)",
                          background: r.status === "matched" ? "var(--color-income-dim)" : "var(--color-warning-dim)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: 999,
                        }}
                      >
                        {r.status === "matched" ? "Cuadrado" : `Ajustado (${r.diff >= 0 ? "+" : ""}$${r.diff})`}
                      </span>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 700, marginTop: "0.25rem" }}>
                        ${r.actual.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
