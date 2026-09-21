"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import { businesses, businessTransactions, projects, projectTransactions, loans, loanPayments, transactions } from "@achouse/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveHouseholdId } from "@/lib/household";
import { createId } from "@paralleldrive/cuid2";

async function getAuthContext() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const householdId = await getActiveHouseholdId();
  return { userId, householdId };
}

// ── Businesses ────────────────────────────────────────────────────────────────

export async function getBusinesses() {
  const { householdId } = await getAuthContext();
  const [bizList, txs] = await Promise.all([
    db.query.businesses.findMany({
      where: and(eq(businesses.householdId, householdId), isNull(businesses.deletedAt)),
      orderBy: (b, { asc }) => [asc(b.name)],
    }),
    db.query.transactions.findMany({
      where: and(
        eq(transactions.householdId, householdId),
        isNull(transactions.deletedAt)
      ),
    }),
  ]);

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return bizList.map((b) => {
    const bTxs = txs.filter((t) => t.businessId === b.id);
    const income = bTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
    const expenses = bTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
    const net = income - expenses;

    const monthlyMap = new Map<string, { month: string; income: number; expenses: number }>();
    bTxs.forEach((t) => {
      const d = new Date(t.date);
      const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      const cur = monthlyMap.get(mKey) ?? { month: mKey, income: 0, expenses: 0 };
      const amt = parseFloat(t.amount || "0");
      if (t.type === "income") cur.income += amt;
      else if (t.type === "expense") cur.expenses += amt;
      monthlyMap.set(mKey, cur);
    });

    return {
      ...b,
      income,
      expenses,
      net,
      transactions: bTxs.length,
      monthlyData: Array.from(monthlyMap.values()),
    };
  });
}

export async function createBusiness(data: { name: string; description?: string; type?: string; currency?: string }) {
  const { householdId } = await getAuthContext();
  const [biz] = await db.insert(businesses).values({
    id: createId(),
    householdId,
    ...data,
    currency: data.currency ?? "DOP",
  }).returning();
  revalidatePath("/dashboard/businesses");
  return { success: true, business: biz };
}

export async function updateBusiness(id: string, data: Partial<{ name: string; description: string; type: string; currency: string; isActive: boolean }>) {
  const { householdId } = await getAuthContext();
  await db.update(businesses).set(data).where(and(eq(businesses.id, id), eq(businesses.householdId, householdId)));
  revalidatePath("/dashboard/businesses");
  return { success: true };
}

export async function deleteBusiness(id: string) {
  const { householdId } = await getAuthContext();
  await db.update(businesses).set({ deletedAt: new Date(), isActive: false }).where(and(eq(businesses.id, id), eq(businesses.householdId, householdId)));
  revalidatePath("/dashboard/businesses");
  return { success: true };
}

export async function getBusinessPL(businessId: string) {
  const txs = await db.query.transactions.findMany({
    where: and(eq(transactions.businessId, businessId), isNull(transactions.deletedAt)),
    orderBy: [desc(transactions.date)],
    with: { category: true, member: true, account: true },
  });
  const income = txs.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  return { income, expenses, net: income - expenses, transactions: txs };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects() {
  const { householdId } = await getAuthContext();
  return db.query.projects.findMany({
    where: and(eq(projects.householdId, householdId), isNull(projects.deletedAt)),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    with: { member: true, business: true },
  });
}

export async function createProject(data: {
  name: string; description?: string; budget?: number; currency?: string;
  startDate: string; endDate?: string; memberId?: string; businessId?: string;
}) {
  const { householdId } = await getAuthContext();
  const [proj] = await db.insert(projects).values({
    householdId,
    name: data.name,
    description: data.description ?? null,
    budget: data.budget?.toString() ?? null,
    currency: data.currency ?? "USD",
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    memberId: data.memberId ?? null,
    businessId: data.businessId ?? null,
    status: "active",
  }).returning();
  revalidatePath("/dashboard/projects");
  return { success: true, project: proj };
}

export async function updateProject(id: string, data: Partial<{
  name: string; description: string; budget: number; status: "active"|"paused"|"completed"|"cancelled"; endDate: string;
}>) {
  const { householdId } = await getAuthContext();
  await db.update(projects).set({
    ...data,
    budget: data.budget?.toString(),
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    completedAt: data.status === "completed" ? new Date() : undefined,
  }).where(and(eq(projects.id, id), eq(projects.householdId, householdId)));
  revalidatePath("/dashboard/projects");
  return { success: true };
}

export async function deleteProject(id: string) {
  const { householdId } = await getAuthContext();
  await db.update(projects).set({ deletedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.householdId, householdId)));
  revalidatePath("/dashboard/projects");
  return { success: true };
}

// ── Loans ─────────────────────────────────────────────────────────────────────

export async function getLoans() {
  const { householdId } = await getAuthContext();
  return db.query.loans.findMany({
    where: and(eq(loans.householdId, householdId), isNull(loans.deletedAt)),
    orderBy: (l, { desc }) => [desc(l.createdAt)],
    with: { payments: true, lenderMember: true, borrowerMember: true },
  });
}

export async function createLoan(data: {
  name: string; lenderType: "bank"|"person"|"internal_member"; lenderName?: string;
  lenderMemberId?: string; borrowerMemberId?: string; principalAmount: number;
  interestRate?: number; interestType?: "fixed"|"variable"|"none";
  monthlyPayment?: number; startDate: string; endDate?: string; currency?: string; accountId?: string;
}) {
  const { householdId } = await getAuthContext();
  const [loan] = await db.insert(loans).values({
    householdId,
    name: data.name,
    lenderType: data.lenderType,
    lenderName: data.lenderName ?? null,
    lenderMemberId: data.lenderMemberId ?? null,
    borrowerMemberId: data.borrowerMemberId ?? null,
    principalAmount: data.principalAmount.toString(),
    remainingBalance: data.principalAmount.toString(),
    interestRate: (data.interestRate ?? 0).toString(),
    interestType: data.interestType ?? "fixed",
    monthlyPayment: data.monthlyPayment?.toString() ?? null,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    currency: data.currency ?? "USD",
    accountId: data.accountId ?? null,
  }).returning();
  revalidatePath("/dashboard/loans");
  return { success: true, loan };
}

export async function registerLoanPayment(loanId: string, data: {
  amount: number; principalPaid: number; interestPaid: number; date: string; notes?: string;
}) {
  const { householdId } = await getAuthContext();
  const loan = await db.query.loans.findFirst({ where: eq(loans.id, loanId) });
  if (!loan) throw new Error("Loan not found");

  const [payment] = await db.insert(loanPayments).values({
    loanId,
    amount: data.amount.toString(),
    principalPaid: data.principalPaid.toString(),
    interestPaid: data.interestPaid.toString(),
    date: new Date(data.date),
    notes: data.notes ?? null,
  }).returning();

  const newBalance = Math.max(0, parseFloat(loan.remainingBalance) - data.principalPaid);
  await db.update(loans).set({ remainingBalance: newBalance.toString() }).where(eq(loans.id, loanId));

  revalidatePath("/dashboard/loans");
  return { success: true, payment };
}

export async function deleteLoan(id: string) {
  const { householdId } = await getAuthContext();
  await db.update(loans).set({ deletedAt: new Date(), isActive: false }).where(and(eq(loans.id, id), eq(loans.householdId, householdId)));
  revalidatePath("/dashboard/loans");
  return { success: true };
}

export async function calculateAmortization(
  principal: number, annualRate: number, monthlyPayment: number, startDate: Date
) {
  const rows = [];
  let balance = principal;
  const monthlyRate = annualRate / 100 / 12;
  const date = new Date(startDate);
  let month = 1;

  while (balance > 0.01 && month <= 360) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    rows.push({
      month,
      date: new Date(date),
      payment: monthlyPayment,
      principal: principalPaid,
      interest,
      balance,
    });
    date.setMonth(date.getMonth() + 1);
    month++;
    if (balance <= 0) break;
  }
  return rows;
}
