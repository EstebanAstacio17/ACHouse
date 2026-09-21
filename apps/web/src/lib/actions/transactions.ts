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
import { eq, and, desc, gte, lte, ilike, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { transactionSchema } from "@achouse/types";
import { getActiveHouseholdId } from "@/lib/household";
import { createId } from "@paralleldrive/cuid2";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthenticatedMember() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { userId: null, householdId: null, member: null, error: "No autorizado" };
    }
    const householdId = await getActiveHouseholdId();
    if (!householdId) {
      return { userId, householdId: null, member: null, error: "No hay hogar activo seleccionado" };
    }

    let member = await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.clerkUserId, userId),
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.isActive, true)
      ),
    });

    // Fallback: search for member by clerkUserId regardless of active flag or household
    if (!member) {
      member = await db.query.householdMembers.findFirst({
        where: and(eq(householdMembers.clerkUserId, userId), eq(householdMembers.householdId, householdId)),
      });
    }

    if (!member) {
      member = await db.query.householdMembers.findFirst({
        where: and(eq(householdMembers.clerkUserId, userId), eq(householdMembers.isActive, true)),
      });
    }

    // Fallback: pick any active member of this household
    if (!member) {
      member = await db.query.householdMembers.findFirst({
        where: and(eq(householdMembers.householdId, householdId), eq(householdMembers.isActive, true)),
      });
    }

    return { userId, householdId, member, error: null };
  } catch (err: any) {
    return { userId: null, householdId: null, member: null, error: err?.message || "Error de autenticación" };
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
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const authCtx = await getAuthenticatedMember();
  if (authCtx.error || !authCtx.householdId) {
    return [];
  }
  const { householdId } = authCtx;
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 50;
  const offset = (page - 1) * perPage;

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
      member: true,
      business: true,
    },
  });

  return rows;
}

export async function createTransaction(data: z.input<typeof transactionSchema>) {
  try {
    const authCtx = await getAuthenticatedMember();
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

    // 4. Insert transaction directly (neon-http driver does not support interactive transactions)
    const newTxId = createId();
    const [insertedTx] = await db
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
        createdBy: userId,
      })
      .returning();

    // 5. Update account balance safely
    const current = parseFloat(account.balance || "0");
    const amount = parseFloat(parsed.amount.toString());
    let newBalance = current;

    if (parsed.type === "income") {
      newBalance = current + amount;
    } else if (parsed.type === "expense") {
      newBalance = current - amount;
    } else if (parsed.type === "transfer") {
      newBalance = current - amount;
      if (parsed.toAccountId) {
        const toAccount = await db.query.accounts.findFirst({
          where: and(eq(accounts.id, parsed.toAccountId), eq(accounts.householdId, householdId)),
        });
        if (toAccount) {
          const toCurrent = parseFloat(toAccount.balance || "0");
          await db
            .update(accounts)
            .set({ balance: (toCurrent + amount).toFixed(2), updatedAt: new Date() })
            .where(eq(accounts.id, toAccount.id));
        }
      }
    }

    await db
      .update(accounts)
      .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
      .where(eq(accounts.id, account.id));

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

export async function updateTransaction(id: string, data: Partial<z.infer<typeof transactionSchema>>) {
  try {
    const authCtx = await getAuthenticatedMember();
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

    await db
      .update(transactions)
      .set({
        ...data,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        businessId: businessId !== undefined ? businessId : undefined,
        amount: data.amount?.toString(),
        date: data.date ? new Date(data.date) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

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
    const authCtx = await getAuthenticatedMember();
    if (authCtx.error || !authCtx.householdId) {
      return { success: false, error: authCtx.error || "No autorizado" };
    }
    const { householdId } = authCtx;

    await db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)));

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
      netCashFlow: 0,
      topCategories: [],
      recentTransactions: [],
    };
  }
  const { householdId } = authCtx;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [monthlyTxs, allAccounts] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.householdId, householdId),
        isNull(transactions.deletedAt),
        gte(transactions.date, startOfMonth),
        lte(transactions.date, endOfMonth)
      ),
      with: { category: true },
    }),
    db.query.accounts.findMany({
      where: and(eq(accounts.householdId, householdId), eq(accounts.isActive, true), isNull(accounts.deletedAt)),
    }),
  ]);

  const totalBalance = allAccounts.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);
  const monthlyIncome = monthlyTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  const monthlyExpenses = monthlyTxs
    .filter((t) => t.type === "expense")
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
    netCashFlow: monthlyIncome - monthlyExpenses,
    topCategories,
    recentTransactions: monthlyTxs.slice(0, 5),
  };
}
