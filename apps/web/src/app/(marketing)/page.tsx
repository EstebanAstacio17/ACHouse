import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, ShieldCheck, Sparkles, TrendingUp,
  CreditCard, Users, Building2, FolderKanban,
  BarChart3, CheckCircle2, ChevronRight, Zap
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export const metadata: Metadata = {
  title: "ACHouse — Plataforma Inteligente de Finanzas Familiares",
  description:
    "Controla ingresos, gastos, deudas y conciliaciones de tu hogar con una experiencia inspirada en Apple HIG. Gestión familiar colaborativa y multidimensional.",
};

const FEATURES = [
  {
    icon: TrendingUp,
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.12)",
    title: "Ingresos y Gastos",
    description: "Registra y categoriza cada movimiento con recibos adjuntos y conciliación bancaria instantánea.",
  },
  {
    icon: CreditCard,
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.12)",
    title: "Tarjetas y Préstamos",
    description: "Monitorea ciclos de corte, fechas límite, pagos mínimos y tablas de amortización en préstamos bancarios e internos.",
  },
  {
    icon: Users,
    color: "#818cf8",
    bg: "rgba(129, 140, 248, 0.12)",
    title: "Integrantes y Roles",
    description: "Colaboración familiar con roles Admin, Contributor y Viewer. Análisis de aportes y fuentes de ingreso individuales.",
  },
  {
    icon: Building2,
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.12)",
    title: "Negocios Familiares",
    description: "Estado de resultados (P&L) independiente, márgenes de ganancia y control de flujo de caja para emprendimientos.",
  },
  {
    icon: FolderKanban,
    color: "#ec4899",
    bg: "rgba(236, 72, 153, 0.12)",
    title: "Proyectos y Metas",
    description: "Control presupuestario en remodelaciones, viajes o metas de ahorro con alertas de sobrecosto en tiempo real.",
  },
  {
    icon: BarChart3,
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.12)",
    title: "Reportes en Excel y PDF",
    description: "Generación de balances generales consolidados con exportación profesional a hojas de cálculo y documentos PDF.",
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* ── Frosted Navbar ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--border-hair)",
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              boxShadow: "0 2px 14px rgba(99,102,241,0.45)",
            }}
          >
            🏠
          </div>
          <span
            className="brand-title-gradient"
            style={{
              fontWeight: 800,
              fontSize: "1.25rem",
              letterSpacing: "-0.03em",
            }}
          >
            ACHouse
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ThemeToggle />
          <Link href="/sign-in" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
            Iniciar sesión
          </Link>
          <Link href="/sign-up" className="btn btn-primary btn-sm" style={{ fontWeight: 600 }}>
            Comenzar gratis
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section
        style={{
          padding: "5rem 1.5rem 4rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow ambient background */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(800px, 90vw)",
            height: 400,
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(129, 140, 248, 0.05) 50%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: 840, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--accent-subtle)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "var(--radius-full)",
              padding: "0.375rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--accent)",
              marginBottom: "1.75rem",
              boxShadow: "0 2px 10px rgba(99,102,241,0.15)",
            }}
          >
            <Sparkles size={14} /> Estética Apple HIG · Experiencia Financiera Fluida
          </div>

          <h1
            className="hero-title-gradient"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              marginBottom: "1.5rem",
            }}
          >
            Las finanzas de tu hogar,<br />
            con precisión y elegancia.
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-secondary)",
              maxWidth: 620,
              margin: "0 auto 2.5rem",
              lineHeight: 1.65,
              fontWeight: 400,
            }}
          >
            Control multidimensional de ingresos, egresos, tarjetas y préstamos.
            Diseñado para familias, parejas y emprendimientos que buscan claridad total.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/sign-up" className="btn btn-primary btn-lg" style={{ fontSize: "1rem", padding: "0.875rem 1.75rem" }}>
              Comenzar Gratis <ArrowRight size={18} />
            </Link>
            <Link href="/sign-in" className="btn btn-secondary btn-lg" style={{ fontSize: "1rem", padding: "0.875rem 1.75rem" }}>
              Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* ── App Preview Card ── */}
        <div style={{ marginTop: "3.5rem", maxWidth: 1000, margin: "3.5rem auto 0" }}>
          <div
            className="card-glass"
            style={{
              padding: "1.5rem",
              borderRadius: "var(--radius-3xl)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-xl)",
              textAlign: "left",
            }}
          >
            {/* Window chrome header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-hair)", paddingBottom: "0.875rem" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginLeft: "0.5rem", fontWeight: 600 }}>
                ACHouse — Panel Familiar Inteligente
              </span>
            </div>

            {/* Micro Dashboard UI Mockup */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "var(--bg-active)", padding: "1.125rem", borderRadius: "var(--radius-lg)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Patrimonio Neto</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>$62,060.00</p>
                <span style={{ fontSize: "0.73rem", color: "var(--color-income)", fontWeight: 600 }}>+12.4% este mes</span>
              </div>
              <div style={{ background: "var(--bg-active)", padding: "1.125rem", borderRadius: "var(--radius-lg)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Ingresos Familiares</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-income)" }}>$12,800.00</p>
                <span style={{ fontSize: "0.73rem", color: "var(--text-tertiary)" }}>2 integrantes activos</span>
              </div>
              <div style={{ background: "var(--bg-active)", padding: "1.125rem", borderRadius: "var(--radius-lg)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Salud Financiera</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>78 / 100</p>
                <span style={{ fontSize: "0.73rem", color: "var(--color-income)", fontWeight: 600 }}>Rango Excelente</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{ padding: "4rem 2rem", maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
            Módulos construidos para la vida real
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            Todo lo necesario para mantener orden financiero sin complicaciones.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-lg)",
                  background: f.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.color,
                }}
              >
                <f.icon size={22} />
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          padding: "4.5rem 2rem",
          textAlign: "center",
          background: "linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.06) 100%)",
          borderTop: "1px solid var(--border-hair)",
        }}
      >
        <h2 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
          Comienza a gestionar tu hogar hoy
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "1.0625rem" }}>
          Control inteligente, reportes automáticos y colaboración en tiempo real para tu familia.
        </p>
        <Link href="/sign-up" className="btn btn-primary btn-lg" style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}>
          Crear Cuenta Gratuita <ChevronRight size={18} />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "0.8125rem",
          borderTop: "1px solid var(--border-hair)",
        }}
      >
        © {new Date().getFullYear()} ACHouse. Plataforma de Finanzas Familiares. Todos los derechos reservados.
      </footer>
    </div>
  );
}
