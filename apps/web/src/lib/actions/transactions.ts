"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import {
  transactions,
  categories,
  accounts,
  householdMembers,
} from "@achouse/db/schema";
import { eq, and, desc, gte, lte, ilike, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cookies } from "next/headers";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getHouseholdId(): Promise<string> {
  const cookieStore = await cookies();
  const hid = cookieStore.get("household_id")?.value;
  if (!hid) throw new Error("No active household");
  return hid;
}

async function getAuthenticatedMember() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const householdId = await getHouseholdId();

  const member = await db.query.householdMembers.findFirst({
    where: (m) => and(eq(m.clerkUserId, userId), eq(m.householdId, householdId), eq(m.isActive, true)),
  });
  if (!member) throw new Error("Not a member of this household");
  return { userId, householdId, member };
}

// ── Transaction Schema ───────────────────────────────────────────────────────

const transactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  businessId: z.string().optional(),
  projectId: z.string().optional(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("USD"),
  description: z.string().min(1).max(255),
  date: z.string(),
  referenceNo: z.string().optional(),
  status: z.enum(["pending", "cleared", "reconciled"]).default("cleared"),
  isRecurring: z.boolean().default(false),
  toAccountId: z.string().optional(),
});

// ── CRUD Operations ──────────────────────────────────────────────────────────

export async function getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  categoryId?: string;
  memberId?: string;
  accountId?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { householdId } = await getAuthenticatedMember();
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
    },
  });

  return rows;
}

export async function createTransaction(data: z.infer<typeof transactionSchema>) {
  const { householdId, userId, member } = await getAuthenticatedMember();
  const parsed = transactionSchema.parse(data);

  const [tx] = await db
    .insert(transactions)
    .values({
      householdId,
      accountId: parsed.accountId,
      categoryId: parsed.categoryId ?? null,
      memberId: parsed.memberId ?? member.id,
      businessId: parsed.businessId ?? null,
      projectId: parsed.projectId ?? null,
      type: parsed.type,
      amount: parsed.amount.toString(),
      currency: parsed.currency,
      description: parsed.description,
      date: new Date(parsed.date),
      referenceNo: parsed.referenceNo ?? null,
      status: parsed.status,
      isRecurring: parsed.isRecurring,
      toAccountId: parsed.toAccountId ?? null,
      createdBy: userId,
    })
    .returning();

  // Update account balance
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, parsed.accountId),
  });
  if (account) {
    const current = parseFloat(account.balance);
    const amount = parseFloat(parsed.amount.toString());
    const newBalance =
      parsed.type === "income"
        ? current + amount
        : current - amount;
    await db
      .update(accounts)
      .set({ balance: newBalance.toString() })
      .where(eq(accounts.id, parsed.accountId));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  return { success: true, transaction: tx };
}

export async function updateTransaction(id: string, data: Partial<z.infer<typeof transactionSchema>>) {
  const { householdId } = await getAuthenticatedMember();

  const existing = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
  });
  if (!existing) throw new Error("Transaction not found");

  await db
    .update(transactions)
    .set({
      ...data,
      amount: data.amount?.toString(),
      date: data.date ? new Date(data.date) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id));

  revalidatePath("/dashboard/transactions");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const { householdId } = await getAuthenticatedMember();

  await db
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)));

  revalidatePath("/dashboard/transactions");
  return { success: true };
}

export async function getDashboardKPIs() {
  const { householdId } = await getAuthenticatedMember();

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
      where: and(eq(accounts.householdId, householdId), eq(accounts.isActive, true)),
    }),
  ]);

  const totalBalance = allAccounts.reduce((s, a) => s + parseFloat(a.balance), 0);
  const monthlyIncome = monthlyTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const monthlyExpenses = monthlyTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  // Top categories by expense
  const catMap = new Map<string, { name: string; amount: number; color: string }>();
  monthlyTxs
    .filter((t) => t.type === "expense" && t.category)
    .forEach((t) => {
      const cat = t.category!;
      const existing = catMap.get(cat.id) ?? { name: cat.name, amount: 0, color: cat.color };
      catMap.set(cat.id, { ...existing, amount: existing.amount + parseFloat(t.amount) });
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
