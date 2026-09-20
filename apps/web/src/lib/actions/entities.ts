"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import { categories, accounts, householdMembers } from "@achouse/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cookies } from "next/headers";

async function getHouseholdId() {
  const cookieStore = await cookies();
  const hid = cookieStore.get("household_id")?.value;
  if (!hid) throw new Error("No active household");
  return hid;
}

async function getAuthContext() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const householdId = await getHouseholdId();
  return { userId, householdId };
}

// ── Categories ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#6366f1"),
  icon: z.string().default("tag"),
  parentId: z.string().nullable().optional(),
});

export async function getCategories() {
  const { householdId } = await getAuthContext();
  return db.query.categories.findMany({
    where: and(eq(categories.householdId, householdId), isNull(categories.deletedAt), eq(categories.isActive, true)),
    orderBy: (c, { asc }) => [asc(c.type), asc(c.name)],
  });
}

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const { householdId } = await getAuthContext();
  const parsed = categorySchema.parse(data);
  const [cat] = await db.insert(categories).values({ ...parsed, householdId, parentId: parsed.parentId ?? null }).returning();
  revalidatePath("/dashboard/categories");
  return { success: true, category: cat };
}

export async function updateCategory(id: string, data: Partial<z.infer<typeof categorySchema>>) {
  const { householdId } = await getAuthContext();
  await db.update(categories).set(data).where(and(eq(categories.id, id), eq(categories.householdId, householdId)));
  revalidatePath("/dashboard/categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const { householdId } = await getAuthContext();
  await db.update(categories).set({ deletedAt: new Date(), isActive: false }).where(and(eq(categories.id, id), eq(categories.householdId, householdId)));
  revalidatePath("/dashboard/categories");
  return { success: true };
}

// ── Accounts ─────────────────────────────────────────────────────────────────

const accountSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["checking", "savings", "credit", "cash"]),
  balance: z.coerce.number().default(0),
  currency: z.string().length(3).default("USD"),
  creditLimit: z.coerce.number().optional(),
  statementDay: z.coerce.number().min(1).max(31).optional(),
  paymentDueDay: z.coerce.number().min(1).max(31).optional(),
  minimumPayment: z.coerce.number().optional(),
});

export async function getAccounts() {
  const { householdId } = await getAuthContext();
  return db.query.accounts.findMany({
    where: and(eq(accounts.householdId, householdId), eq(accounts.isActive, true), isNull(accounts.deletedAt)),
    orderBy: (a, { asc }) => [asc(a.type), asc(a.name)],
  });
}

export async function createAccount(data: z.infer<typeof accountSchema>) {
  const { householdId } = await getAuthContext();
  const parsed = accountSchema.parse(data);
  const [acc] = await db.insert(accounts).values({
    householdId,
    name: parsed.name,
    type: parsed.type,
    balance: parsed.balance.toString(),
    currency: parsed.currency,
    creditLimit: parsed.creditLimit?.toString() ?? null,
    availableCredit: parsed.creditLimit?.toString() ?? null,
    statementDay: parsed.statementDay ?? null,
    paymentDueDay: parsed.paymentDueDay ?? null,
    minimumPayment: parsed.minimumPayment?.toString() ?? null,
    currentStatementBalance: "0",
  }).returning();
  revalidatePath("/dashboard/accounts");
  return { success: true, account: acc };
}

export async function updateAccount(id: string, data: Partial<z.infer<typeof accountSchema>>) {
  const { householdId } = await getAuthContext();
  await db.update(accounts).set({
    ...data,
    balance: data.balance !== undefined ? data.balance.toString() : undefined,
    creditLimit: data.creditLimit !== undefined ? data.creditLimit?.toString() : undefined,
    minimumPayment: data.minimumPayment !== undefined ? data.minimumPayment?.toString() : undefined,
    updatedAt: new Date(),
  }).where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)));
  revalidatePath("/dashboard/accounts");
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { householdId } = await getAuthContext();
  await db.update(accounts).set({ isActive: false, deletedAt: new Date() }).where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)));
  revalidatePath("/dashboard/accounts");
  return { success: true };
}

// ── Members ──────────────────────────────────────────────────────────────────

export async function getMembers() {
  const { householdId } = await getAuthContext();
  return db.query.householdMembers.findMany({
    where: and(eq(householdMembers.householdId, householdId), eq(householdMembers.isActive, true)),
    with: { incomeSources: true },
  });
}

export async function updateMemberRole(memberId: string, role: "admin" | "contributor" | "viewer") {
  const { householdId } = await getAuthContext();
  await db.update(householdMembers).set({ role }).where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, householdId)));
  revalidatePath("/dashboard/members");
  return { success: true };
}
