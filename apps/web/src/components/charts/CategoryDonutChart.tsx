"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatMoney } from "@/lib/geo";

export interface CategoryDonutItem {
  name: string;
  value: number;
  color: string;
}

interface CategoryDonutChartProps {
  data?: CategoryDonutItem[];
  currency?: string;
}

const CustomTooltip = ({ active, payload, totalExpense, currency = "DOP" }: any) => {
  if (active && payload && payload.length && totalExpense > 0) {
    const data = payload[0];
    const pct = ((data.value / totalExpense) * 100).toFixed(1);
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "0.5rem 0.875rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <p style={{ fontWeight: 600, color: data.payload.color, fontSize: "0.875rem" }}>
          {data.name}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginTop: "0.125rem" }}>
          {formatMoney(data.value, currency)} ({pct}%)
        </p>
      </div>
    );
  }
  return null;
};

export function CategoryDonutChart({ data = [], currency = "DOP" }: CategoryDonutChartProps) {
  const totalExpense = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Gastos por Categoría
        </h3>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          Distribución porcentual de egresos este mes
        </p>
      </div>

      <div style={{ position: "relative", width: "100%", height: 220 }}>
        {data.length === 0 || totalExpense === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", gap: "0.5rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>Sin egresos este mes</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Los gastos por categoría aparecerán aquí.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={(props: any) => <CustomTooltip {...props} totalExpense={totalExpense} currency={currency} />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Total</span>
              <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {totalExpense >= 1000 ? `$${(totalExpense / 1000).toFixed(1)}k` : formatMoney(totalExpense, currency)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Legend list */}
      {data.length > 0 && totalExpense > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.25rem" }}>
          {data.slice(0, 4).map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
              </span>
              <span style={{ marginLeft: "auto", fontWeight: 600, color: "var(--text-primary)" }}>
                {totalExpense > 0 ? ((c.value / totalExpense) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
