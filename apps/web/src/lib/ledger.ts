import "server-only";
import { db } from "@achouse/db";
import { accounts, auditLog } from "@achouse/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export type BalanceDelta = {
  accountId: string;
  delta: string; // e.g. "500.00" or "-500.00"
};

/**
 * Genera la sentencia de actualización atómica de balance para componer en un db.batch().
 * Ejecuta la suma directamente en el motor PostgreSQL: `balance = balance + delta::numeric`
 * evitando cualquier condición de carrera o descuadre por lecturas concurrentes.
 */
export function buildBalanceAdjustment(householdId: string, accountId: string, delta: string | number) {
  const deltaStr = typeof delta === "number" ? delta.toFixed(2) : String(delta);
  return db
    .update(accounts)
    .set({
      balance: sql`${accounts.balance} + ${deltaStr}::numeric`,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.householdId, householdId)));
}

/**
 * Calcula los efectos netos en los saldos según el tipo de transacción financiera.
 */
export function calculateBalanceEffects(tx: {
  type: "income" | "expense" | "transfer";
  amount: string | number;
  accountId: string;
  toAccountId?: string | null;
}): BalanceDelta[] {
  const amtStr = typeof tx.amount === "number" ? tx.amount.toFixed(2) : String(tx.amount);
  const positiveAmt = amtStr.startsWith("-") ? amtStr.substring(1) : amtStr;

  if (tx.type === "income") {
    return [{ accountId: tx.accountId, delta: positiveAmt }];
  }

  if (tx.type === "expense") {
    return [{ accountId: tx.accountId, delta: `-${positiveAmt}` }];
  }

  if (tx.type === "transfer") {
    const effects: BalanceDelta[] = [{ accountId: tx.accountId, delta: `-${positiveAmt}` }];
    if (tx.toAccountId) {
      effects.push({ accountId: tx.toAccountId, delta: positiveAmt });
    }
    return effects;
  }

  return [];
}

/**
 * Construye una entrada de auditoría para incluir en el batch atómico
 */
export function buildAuditEntry(params: {
  householdId: string;
  memberId?: string | null;
  action: "create" | "update" | "delete" | "reconcile";
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
}) {
  return db.insert(auditLog).values({
    id: createId(),
    householdId: params.householdId,
    memberId: params.memberId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValues: params.oldValues ?? null,
    newValues: params.newValues ?? null,
  });
}
