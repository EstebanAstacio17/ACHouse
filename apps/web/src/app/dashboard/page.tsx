import type { Metadata } from "next";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpDown,
  AlertCircle, CheckCircle2, ArrowRight,
  Plus, UserPlus, CreditCard, Zap,
} from "lucide-react";
import Link from "next/link";
import { MonthlyCashflowChart } from "@/components/charts/MonthlyCashflowChart";
import { CategoryDonutChart }  from "@/components/charts/CategoryDonutChart";
import { getAccounts } from "@/lib/actions/entities";
import { getTransactions } from "@/lib/actions/transactions";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Panel principal de finanzas familiares ACHouse",
};

const quickActions = [
  { label: "Nueva Transacción",  icon: Plus,     href: "/dashboard/transactions",  color: "var(--accent)",        bg: "var(--accent-subtle)" },
  { label: "Añadir Cuenta",     icon: CreditCard, href: "/dashboard/accounts",     color: "var(--color-income)", bg: "var(--color-income-dim)" },
  { label: "Invitar Miembro",   icon: UserPlus,  href: "/dashboard/members",      color: "var(--color-warning)",bg: "var(--color-warning-dim)" },
  { label: "Ver Reportes",      icon: Zap,       href: "/dashboard/reports",      color: "var(--color-expense)",bg: "var(--color-expense-dim)" },
];

/* ── Health Score (CSS-based arc) ──────────────────────────────────────── */
const HEALTH_SCORE = 100;
const CIRCUMFERENCE = 2 * Math.PI * 44;
const DASH = (HEALTH_SCORE / 100) * CIRCUMFERENCE;

/* ═══════════════════════════════════════════════════════════════════════════ */
export default async function DashboardPage() {
  let accountsList: any[] = [];
  let txList: any[] = [];

  try {
    const [accs, txs] = await Promise.all([
      getAccounts(),
      getTransactions({ perPage: 100 }),
    ]);
    accountsList = accs || [];
    txList = txs || [];
  } catch {
    // If not onboarded yet
  }

  const totalBalance = accountsList.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthTxs = txList.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthIncome = thisMonthTxs
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

  const monthExpense = thisMonthTxs
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

  const netFlow = monthIncome - monthExpense;

  const fmtCurrency = (n: number) =>
    n.toLocaleString("es-HN", { style: "currency", currency: "USD" });

  const kpis = [
    {
      label: "Balance Total",
      value: fmtCurrency(totalBalance),
      change: accountsList.length > 0 ? `${accountsList.length} cuentas` : "Sin cuentas",
      positive: totalBalance >= 0,
      icon: Wallet,
      color: "var(--accent)",
      bg: "var(--accent-subtle)",
      border: "var(--accent-glow)",
      sub: "Todas las cuentas",
    },
    {
      label: "Ingresos del Mes",
      value: fmtCurrency(monthIncome),
      change: `${thisMonthTxs.filter(t => t.type === "income").length} ingresos`,
      positive: true,
      icon: TrendingUp,
      color: "var(--color-income)",
      bg: "var(--color-income-dim)",
      border: "var(--color-income-dim)",
      sub: "Mes actual",
    },
    {
      label: "Gastos del Mes",
      value: fmtCurrency(monthExpense),
      change: `${thisMonthTxs.filter(t => t.type === "expense").length} gastos`,
      positive: false,
      icon: TrendingDown,
      color: "var(--color-expense)",
      bg: "var(--color-expense-dim)",
      border: "var(--color-expense-dim)",
      sub: "Mes actual",
    },
    {
      label: "Flujo Neto",
      value: fmtCurrency(netFlow),
      change: netFlow >= 0 ? "Superávit" : "Déficit",
      positive: netFlow >= 0,
      icon: ArrowUpDown,
      color: netFlow >= 0 ? "var(--color-income)" : "var(--color-warning)",
      bg: netFlow >= 0 ? "var(--color-income-dim)" : "var(--color-warning-dim)",
      border: netFlow >= 0 ? "var(--color-income-dim)" : "var(--color-warning-dim)",
      sub: "Ingresos − Gastos",
    },
  ];

  const recentTransactions = txList.slice(0, 5).map(t => ({
    id: t.id,
    description: t.description,
    category: t.category?.name || "General",
    amount: parseFloat(t.amount || "0"),
    date: new Date(t.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
    member: t.member?.displayName || "Hogar",
    type: t.type as "income" | "expense",
  }));

  const upcomingAlerts: Array<{ label: string; date: string; days: number; type: "warning" | "info" }> = accountsList
    .filter(a => a.type === "credit" && a.paymentDueDay)
    .map(a => ({
      label: `Pago Tarjeta: ${a.name}`,
      date: `Día ${a.paymentDueDay} de cada mes`,
      days: Math.max(1, (a.paymentDueDay! - now.getDate() + 30) % 30),
      type: "warning" as const,
    }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Septiembre 2026 · Mi Hogar</p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {quickActions.map((qa) => (
            <Link
              key={qa.href}
              href={qa.href}
              className="btn btn-secondary"
              style={{ fontSize: "0.8125rem", gap: "0.4rem", borderRadius: "var(--radius-md)" }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: qa.bg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <qa.icon size={12} color={qa.color} strokeWidth={2.5} />
              </span>
              {qa.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────────────────── */}
      <div className="grid-kpi">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="kpi-card animate-fade-in-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {/* Top row: label + icon */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.125rem" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.01em", textTransform: "uppercase" }}>
                {kpi.label}
              </p>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: kpi.bg,
                  border: `1px solid ${kpi.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <kpi.icon size={17} color={kpi.color} strokeWidth={2} />
              </div>
            </div>

            {/* Value */}
            <p style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              marginBottom: "0.75rem",
              fontVariantNumeric: "tabular-nums",
            }}>
              {kpi.value}
            </p>

            {/* Change badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{
                fontSize: "0.73rem",
                fontWeight: 700,
                color: kpi.positive ? "var(--color-income)" : "var(--color-expense)",
                background: kpi.positive ? "var(--color-income-dim)" : "var(--color-expense-dim)",
                padding: "0.125rem 0.5rem",
                borderRadius: "var(--radius-full)",
              }}>
                {kpi.change}
              </span>
              <span style={{ fontSize: "0.73rem", color: "var(--text-tertiary)" }}>{kpi.sub}</span>
            </div>

            {/* Bottom accent line */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
              background: `linear-gradient(90deg, ${kpi.color}40, ${kpi.color}00)`,
            }} />
          </div>
        ))}
      </div>

      {/* ── Charts Row + Health Score ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 240px", gap: "1rem", alignItems: "stretch" }}>
        <MonthlyCashflowChart />
        <CategoryDonutChart />

        {/* Financial Health Score */}
        <div
          className="card animate-fade-in-up"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "0.75rem",
            animationDelay: "200ms",
          }}
        >
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Salud Financiera
          </p>

          {/* SVG Arc ring */}
          <div style={{ position: "relative", width: 110, height: 110 }}>
            <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle
                cx="55" cy="55" r="44"
                fill="none"
                stroke="var(--bg-hover)"
                strokeWidth="8"
              />
              {/* Progress */}
              <circle
                cx="55" cy="55" r="44"
                fill="none"
                stroke="url(#healthGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${DASH} ${CIRCUMFERENCE}`}
                style={{ transition: "stroke-dasharray 1.2s var(--ease-apple)" }}
              />
              <defs>
                <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--color-income)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center label */}
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: "1.625rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {HEALTH_SCORE}
              </span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", marginTop: 2 }}>/ 100</span>
            </div>
          </div>

          <div>
            <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-income)", letterSpacing: "-0.015em" }}>
              Excelente
            </p>
            <p style={{ fontSize: "0.73rem", color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>
              Listo para registrar tus primeros datos
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1rem", alignItems: "start" }}>

        {/* Recent Transactions */}
        <div className="card animate-fade-in-up" style={{ padding: 0, animationDelay: "120ms" }}>
          <div style={{
            padding: "1.125rem 1.5rem",
            borderBottom: "1px solid var(--border-hair)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.02em" }}>
              Transacciones Recientes
            </h2>
            <Link href="/dashboard/transactions" className="btn btn-ghost btn-sm" style={{ gap: "0.25rem", fontSize: "0.78rem" }}>
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Miembro</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
                      No hay transacciones registradas aún.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{tx.description}</span>
                      </td>
                      <td>
                        <span className="chip">{tx.category}</span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                        {tx.member}
                      </td>
                      <td style={{ color: "var(--text-tertiary)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                        {tx.date}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={tx.type === "income" ? "amount-income" : "amount-expense"}>
                          {tx.type === "income" ? "+" : ""}
                          {Math.abs(tx.amount).toLocaleString("es-HN", { style: "currency", currency: "USD" })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upcoming Alerts */}
        <div className="card animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            Próximos Vencimientos
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {upcomingAlerts.length === 0 ? (
              <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                <CheckCircle2 size={24} style={{ margin: "0 auto 0.5rem", opacity: 0.3 }} />
                <p style={{ fontWeight: 600 }}>Sin vencimientos pendientes</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: 2 }}>No hay pagos programados próximos.</p>
              </div>
            ) : (
              upcomingAlerts.map((alert) => (
                <div
                  key={alert.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    background: "var(--bg-hover)",
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${alert.type === "warning" ? "rgba(251,146,60,0.25)" : "var(--border-hair)"}`,
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    {alert.type === "warning"
                      ? <AlertCircle size={14} color="var(--color-warning)" strokeWidth={2} style={{ flexShrink: 0 }} />
                      : <CheckCircle2 size={14} color="var(--accent)" strokeWidth={2} style={{ flexShrink: 0 }} />
                    }
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 }} className="truncate">
                        {alert.label}
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: 2 }}>
                        {alert.date}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: alert.type === "warning" ? "var(--color-warning)" : "var(--text-tertiary)",
                    background: alert.type === "warning" ? "rgba(251,146,60,0.12)" : "var(--bg-active)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    {alert.days}d
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Link to full calendar */}
          <Link
            href="/dashboard/reports"
            className="btn btn-ghost btn-sm"
            style={{ width: "100%", marginTop: "0.75rem", fontSize: "0.78rem", justifyContent: "center" }}
          >
            Ver todos los vencimientos
          </Link>
        </div>
      </div>
    </div>
  );
}
