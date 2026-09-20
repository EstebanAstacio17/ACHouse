import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { transactions, accounts, categories, householdMembers, loans } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor", "viewer"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const memberId = searchParams.get("memberId");

  try {
    const conditions = [
      eq(transactions.householdId, householdId),
      isNull(transactions.deletedAt),
    ];

    if (startDate) conditions.push(gte(transactions.date, new Date(startDate)));
    if (endDate) conditions.push(lte(transactions.date, new Date(endDate)));
    if (memberId) conditions.push(eq(transactions.memberId, memberId));

    const allTx = await db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        category: true,
        account: true,
        member: true,
      },
      orderBy: (t, { asc }) => [asc(t.date)],
    });

    const allAccounts = await db.query.accounts.findMany({
      where: and(eq(accounts.householdId, householdId), isNull(accounts.deletedAt)),
    });

    const allLoans = await db.query.loans.findMany({
      where: and(eq(loans.householdId, householdId), isNull(loans.deletedAt)),
    });

    // Summary calculations
    const totalIncome = allTx
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const totalExpense = allTx
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const netCashflow = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, ((netCashflow / totalIncome) * 100)).toFixed(1) : "0.0";

    const totalAssets = allAccounts
      .filter((a) => parseFloat(a.balance) > 0)
      .reduce((acc, a) => acc + parseFloat(a.balance), 0);

    const totalLiabilities =
      allAccounts
        .filter((a) => parseFloat(a.balance) < 0)
        .reduce((acc, a) => acc + Math.abs(parseFloat(a.balance)), 0) +
      allLoans.reduce((acc, l) => acc + parseFloat(l.remainingBalance), 0);

    const netWorth = totalAssets - totalLiabilities;

    // Group expenses by category
    const categoryMap: { [name: string]: { amount: number; color: string } } = {};
    for (const tx of allTx.filter((t) => t.type === "expense")) {
      const catName = tx.category?.name || "Sin categoría";
      const catColor = tx.category?.color || "#94a3b8";
      if (!categoryMap[catName]) {
        categoryMap[catName] = { amount: 0, color: catColor };
      }
      categoryMap[catName].amount += parseFloat(tx.amount);
    }

    const expensesByCategory = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      amount: data.amount,
      color: data.color,
      percentage: totalExpense > 0 ? parseFloat(((data.amount / totalExpense) * 100).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        netCashflow,
        savingsRate: parseFloat(savingsRate),
        totalAssets,
        totalLiabilities,
        netWorth,
      },
      expensesByCategory,
      transactionCount: allTx.length,
    });
  } catch (error) {
    console.error("[GET reports]", error);
    return NextResponse.json({ error: "Error al generar reportes" }, { status: 500 });
  }
}
