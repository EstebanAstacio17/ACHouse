"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import { formatMoney } from "@/lib/geo";

const MONTHLY_DATA: Array<{ month: string; ingresos: number; egresos: number; flujo: number }> = [];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "0.75rem 1rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.375rem", fontSize: "0.875rem" }}>
          {label} 2026
        </p>
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              fontSize: "0.8125rem",
              color: entry.color,
              marginTop: "0.25rem",
            }}
          >
            <span>{entry.name}:</span>
            <span style={{ fontWeight: 700 }}>
              {formatMoney(entry.value, "DOP")}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function MonthlyCashflowChart() {
  const [view, setView] = useState<"bar" | "grouped">("bar");

  return (
    <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Flujo de Caja Mensual
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Comparativa de ingresos vs egresos en los últimos 6 meses
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.375rem", background: "var(--bg-card-alt)", padding: "0.25rem", borderRadius: "var(--radius-md)" }}>
          <button
            onClick={() => setView("bar")}
            className="btn btn-sm"
            style={{
              background: view === "bar" ? "var(--bg-card)" : "transparent",
              color: view === "bar" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: view === "bar" ? "var(--shadow-xs)" : "none",
              border: "none",
              fontSize: "0.75rem",
              padding: "0.25rem 0.625rem",
            }}
          >
            Barras
          </button>
        </div>
      </div>

      <div style={{ width: "100%", height: 280, marginTop: "0.5rem" }}>
        {MONTHLY_DATA.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", gap: "0.5rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>Sin datos de flujo mensual</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Registra transacciones para comparar ingresos vs egresos.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hair)" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={{ stroke: "var(--border-hair)" }}
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: "var(--border-hair)" }}
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: "0.8125rem" }}
                iconType="circle"
              />
              <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="egresos" name="Egresos" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
