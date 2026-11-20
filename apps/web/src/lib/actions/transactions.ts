"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import {
  transactions,
  categories,
  accounts,
  householdMembers,
  businesses,
} from "@achouse/db/schema";
import { eq, and, desc, gte, lte, ilike, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { transactionSchema } from "@achouse/types";
import { getActiveHouseholdId } from "@/lib/household";
import { createId } from "@paralleldrive/cuid2";
import { getTenantContext, requireWriter } from "@/lib/tenant";
import { buildBalanceAdjustment, calculateBalanceEffects, buildAuditEntry } from "@/lib/ledger";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthenticatedMember(requireWrite = false) {
  try {
    const ctx = requireWrite ? await requireWriter() : await getTenantContext();
    return {
      userId: ctx.userId,
      householdId: ctx.householdId,
      member: ctx.member,
      role: ctx.role,
      error: null,
    };
  } catch (err: any) {
    return {
      userId: null,
      householdId: null,
      member: null,
      role: null,
      error: err?.message || "No autorizado o sin permisos suficientes",
    };
  }
}

// ── CRUD Operations ──────────────────────────────────────────────────────────

export async function getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  categoryId?: string;
  memberId?: string;
  accountId?: string;
  businessId?: string;
  conceptType?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const authCtx = await getAuthenticatedMember();
  if (authCtx.error || !authCtx.householdId) {
    return [];
  }
  const { householdId } = authCtx;
  const isAll = filters?.perPage === 0 || filters?.perPage === -1;
  const page = filters?.page ?? 1;
  const perPage = isAll ? 5000 : (filters?.perPage ?? 50);
  const offset = isAll ? 0 : (page - 1) * perPage;

  const conditions = [
    eq(transactions.householdId, householdId),
    isNull(transactions.deletedAt),
  ];

  if (filters?.startDate) {
    conditions.push(gte(transactions.date, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(transactions.date, new Date(filters.endDate)));
  }
  if (filters?.type) {
    conditions.push(eq(transactions.type, filters.type as any));
  }
  if (filters?.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }
  if (filters?.memberId) {
    conditions.push(eq(transactions.memberId, filters.memberId));
  }
  if (filters?.accountId) {
    conditions.push(eq(transactions.accountId, filters.accountId));
  }
  if (filters?.businessId) {
    conditions.push(eq(transactions.businessId, filters.businessId));
  }
  if (filters?.conceptType) {
    conditions.push(eq(transactions.conceptType, filters.conceptType));
  }
  if (filters?.search) {
    conditions.push(ilike(transactions.description, `%${filters.search}%`));
  }

  const rows = await db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit: perPage,
    offset,
    with: {
      category: true,
      account: true,
      toAccount: true,
      member: true,
      business: true,
    },
  });

  return rows;
}

export async function createTransaction(data: z.input<typeof transactionSchema>) {
  try {
    const authCtx = await getAuthenticatedMember(true);
    if (authCtx.error || !authCtx.householdId || !authCtx.userId) {
      return { success: false, error: authCtx.error || "No autorizado o sin hogar activo" };
    }
    const { householdId, userId, member } = authCtx;

    const parsedResult = transactionSchema.safeParse(data);
    if (!parsedResult.success) {
      const errorMsg = parsedResult.error.issues[0]?.message || "Datos de transacción inválidos";
      return { success: false, error: errorMsg };
    }
    const parsed = parsedResult.data;

    // 1. Verify account belongs to this household (BOLA protection)
    let account = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, parsed.accountId), eq(accounts.householdId, householdId)),
    });

    // Fallback: if specified account is not found, fallback to first active account in household
    if (!account) {
      const fallbackAccount = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.householdId, householdId),
          eq(accounts.isActive, true),
          isNull(accounts.deletedAt)
        ),
      });
      if (!fallbackAccount) {
        return { success: false, error: "No se encontró una cuenta activa disponible para esta transacción." };
      }
      account = fallbackAccount;
    }

    // 2. Validate category and business with bidirectional correlation
    let categoryId: string | null = parsed.categoryId ?? null;
    let businessId: string | null = parsed.businessId ?? null;

    const [householdBizs, householdCats] = await Promise.all([
      db.query.businesses.findMany({
        where: and(eq(businesses.householdId, householdId), isNull(businesses.deletedAt)),
      }),
      db.query.categories.findMany({
        where: and(eq(categories.householdId, householdId), isNull(categories.deletedAt)),
      }),
    ]);

    if (categoryId) {
      const cat = householdCats.find(c => c.id === categoryId);
      if (!cat) {
        categoryId = null;
      } else if (!businessId) {
        // If category belongs to a business, link businessId automatically
        const matchingBiz = householdBizs.find(
          b => b.name.toLowerCase().trim() === cat.name.toLowerCase().trim()
        );
        if (matchingBiz) {
          businessId = matchingBiz.id;
        }
      }
    }

    if (businessId) {
      const biz = householdBizs.find(b => b.id === businessId);
      if (biz) {
        // If category is not set, or if category doesn't match business, find the matching business category
        const targetType = parsed.type === "income" ? "income" : "expense";
        const currentCat = categoryId ? householdCats.find(c => c.id === categoryId) : null;
        
        // If no category was selected or the current category is not for this business and type
        if (!currentCat) {
          const matchingCat = householdCats.find(
            c => c.name.toLowerCase().trim() === biz.name.toLowerCase().trim() && c.type === targetType
          );
          if (matchingCat) {
            categoryId = matchingCat.id;
          }
        }
      }
    }

    // 3. Member ID
    let memberId: string | null = parsed.memberId ?? member?.id ?? null;
    if (memberId) {
      const mem = await db.query.householdMembers.findFirst({
        where: and(
          eq(householdMembers.id, memberId),
          eq(householdMembers.householdId, householdId)
        ),
      });
      if (!mem) {
        memberId = member?.id ?? null;
      }
    }

    // 4. Insert transaction and apply balance changes atomically in a single batch
    const newTxId = createId();
    const insertTxStmt = db
      .insert(transactions)
      .values({
        id: newTxId,
        householdId,
        accountId: account.id,
        categoryId,
        memberId,
        businessId,
        projectId: parsed.projectId ?? null,
        type: parsed.type,
        amount: parsed.amount.toString(),
        currency: data.currency || account.currency || parsed.currency || "DOP",
        description: parsed.description,
        date: new Date(parsed.date),
        referenceNo: parsed.referenceNo ?? null,
        status: parsed.status,
        isRecurring: parsed.isRecurring,
        toAccountId: parsed.toAccountId ?? null,
        conceptType: parsed.conceptType ?? null,
        costBreakdown: parsed.costBreakdown ?? null,
        quoteId: parsed.quoteId ?? null,
        createdBy: userId,
      })
      .returning();

    const batchStatements: any[] = [insertTxStmt];

    // 5. Balance adjustment calculated atomically at the Postgres level
    if (parsed.status !== "pending") {
      const effects = calculateBalanceEffects({
        type: parsed.type,
        amount: parsed.amount,
        accountId: account.id,
        toAccountId: parsed.toAccountId,
      });
      for (const eff of effects) {
        batchStatements.push(buildBalanceAdjustment(householdId, eff.accountId, eff.delta));
      }
    }

    batchStatements.push(
      buildAuditEntry({
        householdId,
        memberId,
        action: "create",
        entityType: "transaction",
        entityId: newTxId,
        newValues: { description: parsed.description, amount: parsed.amount, type: parsed.type },
      })
    );

    const [insertedRows] = await db.batch(batchStatements as any);
    const insertedTx = (insertedRows as any)[0];

    try {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/businesses");
    } catch (revErr) {
      console.warn("revalidatePath warning:", revErr);
    }

    const serializedTx = {
      id: insertedTx.id,
      description: insertedTx.description,
      type: insertedTx.type,
      amount: String(insertedTx.amount),
      currency: insertedTx.currency,
      date: insertedTx.date instanceof Date ? insertedTx.date.toISOString() : String(insertedTx.date),
      status: insertedTx.status,
      isRecurring: insertedTx.isRecurring,
      accountId: insertedTx.accountId,
      categoryId: insertedTx.categoryId,
      memberId: insertedTx.memberId,
      businessId: insertedTx.businessId,
      toAccountId: insertedTx.toAccountId,
    };

    return { success: true, transaction: serializedTx };
  } catch (err: any) {
    console.error("Error in createTransaction:", err);
    return { success: false, error: err?.message || "Error al registrar la transacción" };
  }
}

export async function confirmPendingTransaction(
  id: string,
  options?: {
    accountId?: string;
    depositDate?: string;
    notes?: string;
  }
) {
  try {
    const authCtx = await getAuthenticatedMember(true);
    if (authCtx.error || !authCtx.householdId) {
      return { success: false, error: authCtx.error || "No autorizado" };
    }
    const { householdId } = authCtx;

    const existing = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.householdId, householdId), isNull(transactions.deletedAt)),
    });

    if (!existing) {
      return { success: false, error: "Transacción no encontrada" };
    }

    if (existing.status !== "pending") {
      return { success: false, error: "La transacción ya fue confirmada anteriormente" };
    }

    const targetAccountId = options?.accountId || existing.accountId;
    const targetAccount = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, targetAccountId), eq(accounts.householdId, householdId)),
    });

    if (!targetAccount) {
      return { success: false, error: "Cuenta de depósito no encontrada" };
    }

    const confirmedDate = options?.depositDate ? new Date(options.depositDate) : new Date();

    const updateTxStmt = db
      .update(transactions)
      .set({
        status: "cleared",
        accountId: targetAccountId,
        date: confirmedDate,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
      .returning();

    const effects = calculateBalanceEffects({
      type: existing.type,
      amount: existing.amount,
      accountId: targetAccountId,
      toAccountId: existing.toAccountId,
    });

    const batchStatements: any[] = [updateTxStmt];
    for (const eff of effects) {
      batchStatements.push(buildBalanceAdjustment(householdId, eff.accountId, eff.delta));
    }
    batchStatements.push(
      buildAuditEntry({
        householdId,
        memberId: authCtx.member?.id,
        action: "update",
        entityType: "transaction",
        entityId: id,
        newValues: { status: "cleared", accountId: targetAccountId },
      })
    );

    const [updatedRows] = await db.batch(batchStatements as any);
    const updated = (updatedRows as any)[0];

    try {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/businesses");
    } catch (revErr) {
      console.warn("revalidatePath warning:", revErr);
    }

    return { success: true, transaction: updated };
  } catch (err: any) {
    console.error("Error in confirmPendingTransaction:", err);
    return { success: false, error: err?.message || "Error al confirmar la recepción del dinero" };
  }
}

export async function updateTransaction(id: string, data: Partial<z.infer<typeof transactionSchema>>) {
  try {
    const authCtx = await getAuthenticatedMember(true);
    if (authCtx.error || !authCtx.householdId) {
      return { success: false, error: authCtx.error || "No autorizado" };
    }
    const { householdId } = authCtx;

    const existing = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
    });
    if (!existing) {
      return { success: false, error: "Transacción no encontrada" };
    }

    let categoryId = data.categoryId;
    let businessId = data.businessId;

    const [householdBizs, householdCats] = await Promise.all([
      db.query.businesses.findMany({
        where: and(eq(businesses.householdId, householdId), isNull(businesses.deletedAt)),
      }),
      db.query.categories.findMany({
        where: and(eq(categories.householdId, householdId), isNull(categories.deletedAt)),
      }),
    ]);

    if (categoryId && businessId === undefined) {
      const cat = householdCats.find(c => c.id === categoryId);
      if (cat) {
        const matchingBiz = householdBizs.find(
          b => b.name.toLowerCase().trim() === cat.name.toLowerCase().trim()
        );
        if (matchingBiz) {
          businessId = matchingBiz.id;
        }
      }
    }

    if (businessId && categoryId === undefined) {
      const biz = householdBizs.find(b => b.id === businessId);
      if (biz) {
        const targetType = (data.type || existing.type) === "income" ? "income" : "expense";
        const matchingCat = householdCats.find(
          c => c.name.toLowerCase().trim() === biz.name.toLowerCase().trim() && c.type === targetType
        );
        if (matchingCat) {
          categoryId = matchingCat.id;
        }
      }
    }

    const batchStatements: any[] = [];

    // Revert old effects if the transaction was cleared/reconciled
    const wasActive = existing.status === "cleared" || existing.status === "reconciled";
    if (wasActive) {
      const oldEffects = calculateBalanceEffects({
        type: existing.type,
        amount: existing.amount,
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      });
      for (const eff of oldEffects) {
        const revertDelta = eff.delta.startsWith("-") ? eff.delta.substring(1) : `-${eff.delta}`;
        batchStatements.push(buildBalanceAdjustment(householdId, eff.accountId, revertDelta));
      }
    }

    // Apply new effects if the transaction is or remains cleared/reconciled
    const nextStatus = data.status || existing.status;
    const willBeActive = nextStatus === "cleared" || nextStatus === "reconciled";
    if (willBeActive) {
      const newEffects = calculateBalanceEffects({
        type: (data.type || existing.type) as any,
        amount: data.amount !== undefined ? data.amount : existing.amount,
        accountId: data.accountId || existing.accountId,
        toAccountId: data.toAccountId !== undefined ? data.toAccountId : existing.toAccountId,
      });
      for (const eff of newEffects) {
        batchStatements.push(buildBalanceAdjustment(householdId, eff.accountId, eff.delta));
      }
    }

    batchStatements.push(
      db
        .update(transactions)
        .set({
          ...data,
          categoryId: categoryId !== undefined ? categoryId : undefined,
          businessId: businessId !== undefined ? businessId : undefined,
          amount: data.amount?.toString(),
          date: data.date ? new Date(data.date) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
    );

    batchStatements.push(
      buildAuditEntry({
        householdId,
        memberId: authCtx.member?.id,
        action: "update",
        entityType: "transaction",
        entityId: id,
        oldValues: { amount: existing.amount, status: existing.status, accountId: existing.accountId },
        newValues: { amount: data.amount, status: data.status, accountId: data.accountId },
      })
    );

    await db.batch(batchStatements as any);

    try {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/businesses");
    } catch (revErr) {
      console.warn("revalidatePath warning:", revErr);
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error in updateTransaction:", err);
    return { success: false, error: err?.message || "Error al actualizar la transacción" };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const authCtx = await getAuthenticatedMember(true);
    if (authCtx.error || !authCtx.householdId) {
      return { success: false, error: authCtx.error || "No autorizado" };
    }
    const { householdId } = authCtx;

    const existing = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
    });

    const batchStatements: any[] = [
      db
        .update(transactions)
        .set({ deletedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId))),
    ];

    if (existing && (existing.status === "cleared" || existing.status === "reconciled")) {
      const effects = calculateBalanceEffects({
        type: existing.type,
        amount: existing.amount,
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      });
      // Invert delta to revert balance
      for (const eff of effects) {
        const revertDelta = eff.delta.startsWith("-") ? eff.delta.substring(1) : `-${eff.delta}`;
        batchStatements.push(buildBalanceAdjustment(householdId, eff.accountId, revertDelta));
      }
    }

    batchStatements.push(
      buildAuditEntry({
        householdId,
        memberId: authCtx.member?.id,
        action: "delete",
        entityType: "transaction",
        entityId: id,
        oldValues: { description: existing?.description, amount: existing?.amount },
      })
    );

    await db.batch(batchStatements as any);

    try {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/businesses");
    } catch (revErr) {
      console.warn("revalidatePath warning:", revErr);
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteTransaction:", err);
    return { success: false, error: err?.message || "Error al eliminar la transacción" };
  }
}

export async function getDashboardKPIs() {
  const authCtx = await getAuthenticatedMember();
  if (authCtx.error || !authCtx.householdId) {
    return {
      totalBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      pendingIncome: 0,
      pendingCount: 0,
      netCashFlow: 0,
      topCategories: [],
      recentTransactions: [],
    };
  }
  const { householdId } = authCtx;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [monthlyTxs, pendingResult, balanceResult] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.householdId, householdId),
        isNull(transactions.deletedAt),
        gte(transactions.date, startOfMonth),
        lte(transactions.date, endOfMonth)
      ),
      with: { category: true },
      orderBy: (t, { desc }) => [desc(t.date)],
    }),
    db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.status, "pending"),
          eq(transactions.type, "income"),
          isNull(transactions.deletedAt)
        )
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${accounts.balance}), 0)`,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, householdId),
          eq(accounts.isActive, true),
          isNull(accounts.deletedAt)
        )
      ),
  ]);

  const totalBalance = parseFloat(balanceResult[0]?.total || "0");
  const pendingIncome = parseFloat(pendingResult[0]?.total || "0");
  const pendingCount = pendingResult[0]?.count || 0;

  const monthlyIncome = monthlyTxs
    .filter((t) => t.type === "income" && t.status !== "pending")
    .reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  const monthlyExpenses = monthlyTxs
    .filter((t) => t.type === "expense" && t.status !== "pending")
    .reduce((s, t) => s + parseFloat(t.amount || "0"), 0);

  // Top categories by expense
  const catMap = new Map<string, { name: string; amount: number; color: string }>();
  monthlyTxs
    .filter((t) => t.type === "expense" && t.category)
    .forEach((t) => {
      const cat = t.category!;
      const existing = catMap.get(cat.id) ?? { name: cat.name, amount: 0, color: cat.color };
      catMap.set(cat.id, { ...existing, amount: existing.amount + parseFloat(t.amount || "0") });
    });
  const topCategories = [...catMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    pendingIncome,
    pendingCount,
    netCashFlow: monthlyIncome - monthlyExpenses,
    topCategories,
    recentTransactions: monthlyTxs.slice(0, 5),
  };
}
