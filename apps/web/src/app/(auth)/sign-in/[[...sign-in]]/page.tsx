import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Home, ArrowRight, Shield, ShieldAlert, CheckCircle2, Lock, Clock } from "lucide-react";

const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const hasValidClerkKey =
  (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
  !pubKey.includes("REEMPLAZAR") &&
  pubKey.length > 20;

const REASON_MESSAGES: Record<string, { title: string; desc: string; icon: typeof ShieldAlert; color: string }> = {
  inactivity: {
    title: "Sesión cerrada por inactividad",
    desc: "Por seguridad de tus datos bancarios y presupuestos familiares, tu sesión se cerró automáticamente tras un periodo de inactividad.",
    icon: Clock,
    color: "var(--color-warning)",
  },
  browser_restart: {
    title: "Protección de cierre de navegador",
    desc: "Has cerrado el navegador o reiniciado el equipo. Inicia sesión nuevamente para desbloquear el acceso a tu hogar.",
    icon: Lock,
    color: "var(--accent)",
  },
  max_lifetime: {
    title: "Límite de sesión continua alcanzado",
    desc: "Para mantener la máxima seguridad de tus registros financieros, se requiere verificar tu identidad periódicamente.",
    icon: Shield,
    color: "var(--color-income)",
  },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const reason = params?.reason;
  const reasonInfo = reason && REASON_MESSAGES[reason] ? REASON_MESSAGES[reason] : null;

  const ReasonBanner = reasonInfo ? (
    <div
      style={{
        maxWidth: 440,
        width: "100%",
        marginBottom: "1.25rem",
        padding: "1rem 1.25rem",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.875rem",
        animation: "fadeInUp 0.3s ease-out",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: "var(--bg-card-alt)",
          border: `1px solid ${reasonInfo.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: reasonInfo.color,
          flexShrink: 0,
        }}
      >
        <reasonInfo.icon size={18} />
      </div>
      <div>
        <h4 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.2rem 0", color: "var(--text-primary)" }}>
          {reasonInfo.title}
        </h4>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
          {reasonInfo.desc}
        </p>
      </div>
    </div>
  ) : null;

  if (hasValidClerkKey) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.2), transparent 70%), var(--bg-base)",
          padding: "1.5rem",
        }}
      >
        {ReasonBanner}
        <SignIn />
      </div>
    );
  }

  // Fallback Dev Auth Card when Clerk keys are not configured yet
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18), transparent 70%), var(--surface-0)",
        padding: "1.5rem",
      }}
    >
      {ReasonBanner}
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: 440,
          width: "100%",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          border: "1px solid var(--border-default)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.375rem",
              marginBottom: "1rem",
              boxShadow: "0 8px 16px rgba(99,102,241,0.3)",
            }}
          >
            🏠
          </div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            Iniciar Sesión en ACHouse
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Accede a la gestión financiera de tu hogar
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="label">Correo electrónico</label>
            <input className="input" type="email" placeholder="tu@email.com" />
          </div>
          <div className="form-group">
            <label className="label">Contraseña</label>
            <input className="input" type="password" placeholder="Tu contraseña" />
          </div>

          <Link
            href="/dashboard"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
          >
            Acceder al Dashboard <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/sign-up" style={{ color: "var(--color-brand-400)", fontWeight: 600 }}>
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}

