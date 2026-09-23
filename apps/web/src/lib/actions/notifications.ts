"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import {
  transactions,
  accounts,
  categories,
  householdMembers,
  businesses,
  loans,
  loanPayments,
} from "@achouse/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getActiveHouseholdId } from "@/lib/household";

export interface PlatformNotification {
  id: string;
  category: "activity" | "system";
  type: "income" | "expense" | "transfer" | "receivable" | "system" | "loan";
  severity: "info" | "warning" | "success";
  title: string;
  message: string;
  timestamp: string; // ISO string
  formattedDate: string;
  relativeTime: string;
  actionUrl?: string;
  amount?: string;
  currency?: string;
  accountName?: string;
  memberName?: string;
  businessName?: string;
  categoryName?: string;
  read?: boolean;
}

const SYSTEM_NOTIFICATIONS: Array<{
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "system";
  severity: "info" | "success" | "warning";
  actionUrl: string;
}> = [
  {
    id: "sys-receivables-update",
    title: "🚀 Nueva Funcionalidad: Cobros Pendientes y Clientes",
    message: "Ahora puedes registrar ingresos pendientes por cobrar para tus negocios y clientes, y confirmarlos en 1 clic cuando entre el dinero sin alterar saldos anticipadamente.",
    timestamp: "2026-09-23T12:00:00.000Z",
    type: "system",
    severity: "success",
    actionUrl: "/dashboard/businesses",
  },
  {
    id: "sys-security-timeout",
    title: "🔒 Seguridad: Control de Sesión Inteligente",
    message: "Se ha integrado el bloqueo por inactividad personalizable y protección contra accesos no autorizados en tiempo real.",
    timestamp: "2026-09-22T10:00:00.000Z",
    type: "system",
    severity: "info",
    actionUrl: "/dashboard/settings",
  },
  {
    id: "sys-pl-analytics",
    title: "📊 Analítica de Rentabilidad de Negocios y P&L",
    message: "Visualiza tus ingresos cobrados, cuentas por cobrar y ganancia proyectada en tiempo real en la sección de Negocios.",
    timestamp: "2026-09-20T08:30:00.000Z",
    type: "system",
    severity: "info",
    actionUrl: "/dashboard/businesses",
  },
  {
    id: "sys-reconciliation-tool",
    title: "✨ Motor de Conciliación Bancaria y Reportes",
    message: "Genera reportes de flujo de caja mensuales y concilia diferencias bancarias con mayor precisión.",
    timestamp: "2026-09-18T14:00:00.000Z",
    type: "system",
    severity: "info",
    actionUrl: "/dashboard/reports",
  },
];

function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Justo ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours === 1) return "Hace 1 hora";
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(amount: string | number, currency = "DOP"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: currency || "DOP",
    minimumFractionDigits: 2,
  }).format(num || 0);
}

export async function getHouseholdNotifications(customHouseholdId?: string): Promise<{
  success: boolean;
  notifications: PlatformNotification[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const householdId = customHouseholdId || (await getActiveHouseholdId());
    if (!householdId) {
      return { success: false, notifications: [], unreadCount: 0, error: "No household selected" };
    }

    // 1. Fetch recent transactions with related entities
    const rawTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.householdId, householdId),
        isNull(transactions.deletedAt)
      ),
      orderBy: [desc(transactions.date), desc(transactions.createdAt)],
      limit: 40,
      with: {
        account: true,
        toAccount: true,
        category: true,
        member: true,
      },
    });

    // 2. Fetch businesses to map businessId
    const rawBusinesses = await db.query.businesses.findMany({
      where: and(
        eq(businesses.householdId, householdId),
        isNull(businesses.deletedAt)
      ),
    });
    const businessMap = new Map<string, string>();
    rawBusinesses.forEach((b) => businessMap.set(b.id, b.name));

    // 3. Transform transactions into notifications
    const activityNotifs: PlatformNotification[] = rawTransactions.map((tx) => {
      const txDate = new Date(tx.date || tx.createdAt);
      const bizName = tx.businessId ? businessMap.get(tx.businessId) : undefined;
      const memName = tx.member?.displayName || "Un integrante";
      const accName = tx.account?.name || "Cuenta Principal";
      const catName = tx.category?.name || "General";
      const formattedAmount = formatMoney(tx.amount, tx.currency);

      if (tx.status === "pending" && tx.type === "income") {
        return {
          id: `tx-${tx.id}`,
          category: "activity",
          type: "receivable",
          severity: "warning",
          title: bizName ? `⏳ Cobro Pendiente (${bizName})` : "⏳ Cobro Pendiente por Recibir",
          message: `${memName} registró una cuenta por cobrar de ${formattedAmount}${bizName ? ` del negocio "${bizName}"` : ""}. Pendiente de confirmación para acreditar en ${accName}.`,
          timestamp: txDate.toISOString(),
          formattedDate: txDate.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }),
          relativeTime: getRelativeTimeString(txDate),
          actionUrl: "/dashboard/transactions?status=pending",
          amount: formattedAmount,
          currency: tx.currency,
          accountName: accName,
          memberName: memName,
          businessName: bizName,
          categoryName: catName,
        };
      }

      if (tx.type === "income") {
        return {
          id: `tx-${tx.id}`,
          category: "activity",
          type: "income",
          severity: "success",
          title: bizName ? `💰 Ingreso Recibido (${bizName})` : "💰 Ingreso Registrado",
          message: `${memName} registró la entrada de ${formattedAmount} a la cuenta "${accName}". Categoría: ${catName}.${bizName ? ` Negocio: "${bizName}".` : ""}`,
          timestamp: txDate.toISOString(),
          formattedDate: txDate.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }),
          relativeTime: getRelativeTimeString(txDate),
          actionUrl: "/dashboard/transactions",
          amount: formattedAmount,
          currency: tx.currency,
          accountName: accName,
          memberName: memName,
          businessName: bizName,
          categoryName: catName,
        };
      }

      if (tx.type === "expense") {
        return {
          id: `tx-${tx.id}`,
          category: "activity",
          type: "expense",
          severity: "warning",
          title: bizName ? `💳 Egreso / Pago (${bizName})` : "💳 Egreso / Pago Registrado",
          message: `${memName} pagó ${formattedAmount} desde "${accName}". Categoría: ${catName}.${bizName ? ` Negocio: "${bizName}".` : ""}`,
          timestamp: txDate.toISOString(),
          formattedDate: txDate.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }),
          relativeTime: getRelativeTimeString(txDate),
          actionUrl: "/dashboard/transactions",
          amount: formattedAmount,
          currency: tx.currency,
          accountName: accName,
          memberName: memName,
          businessName: bizName,
          categoryName: catName,
        };
      }

      // Transfer
      const toAccName = tx.toAccount?.name || "otra cuenta";
      return {
        id: `tx-${tx.id}`,
        category: "activity",
        type: "transfer",
        severity: "info",
        title: "🔄 Transferencia entre Cuentas",
        message: `${memName} transfirió ${formattedAmount} desde "${accName}" hacia "${toAccName}".`,
        timestamp: txDate.toISOString(),
        formattedDate: txDate.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }),
        relativeTime: getRelativeTimeString(txDate),
        actionUrl: "/dashboard/accounts",
        amount: formattedAmount,
        currency: tx.currency,
        accountName: accName,
        memberName: memName,
      };
    });

    // 4. Format System Updates
    const systemNotifs: PlatformNotification[] = SYSTEM_NOTIFICATIONS.map((sys) => {
      const sysDate = new Date(sys.timestamp);
      return {
        id: sys.id,
        category: "system",
        type: sys.type,
        severity: sys.severity,
        title: sys.title,
        message: sys.message,
        timestamp: sys.timestamp,
        formattedDate: sysDate.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }),
        relativeTime: getRelativeTimeString(sysDate),
        actionUrl: sys.actionUrl,
      };
    });

    // 5. Combine and sort all notifications by timestamp descending
    const allNotifications = [...activityNotifs, ...systemNotifs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      success: true,
      notifications: allNotifications,
      unreadCount: allNotifications.length,
    };
  } catch (err: any) {
    console.error("Error fetching notifications:", err);
    return {
      success: false,
      notifications: SYSTEM_NOTIFICATIONS.map((sys) => {
        const sysDate = new Date(sys.timestamp);
        return {
          id: sys.id,
          category: "system",
          type: sys.type,
          severity: sys.severity,
          title: sys.title,
          message: sys.message,
          timestamp: sys.timestamp,
          formattedDate: sysDate.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }),
          relativeTime: getRelativeTimeString(sysDate),
          actionUrl: sys.actionUrl,
        };
      }),
      unreadCount: SYSTEM_NOTIFICATIONS.length,
      error: err.message,
    };
  }
}
