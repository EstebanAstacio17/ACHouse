import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { reconciliationEntries, accounts, transactions } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const reconSchema = z.object({
  accountId: z.string().min(1, "La cuenta es obligatoria"),
  date: z.string(),
  expectedBalance: z.string().min(1),
  actualBalance: z.string().min(1),
  notes: z.string().nullable().optional(),
  autoAdjust: z.boolean().default(false),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor", "viewer"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const list = await db.query.reconciliationEntries.findMany({
      where: eq(reconciliationEntries.householdId, householdId),
      orderBy: [desc(reconciliationEntries.date), desc(reconciliationEntries.reconciledAt)],
      with: {
        account: true,
      },
    });

    return NextResponse.json({ reconciliations: list });
  } catch (error) {
    console.error("[GET reconciliation]", error);
    return NextResponse.json({ error: "Error al cargar conciliaciones" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const body = await req.json();
    const parsed = reconSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { accountId, date, expectedBalance, actualBalance, notes, autoAdjust } = parsed.data;
    const diff = parseFloat(actualBalance) - parseFloat(expectedBalance);

    const [entry] = await db
      .insert(reconciliationEntries)
      .values({
        householdId,
        accountId,
        date: new Date(date),
        expectedBalance,
        actualBalance,
        difference: String(diff),
        notes: notes || null,
        reconciledBy: authRes.userId,
      })
      .returning();

    // If autoAdjust is true and difference exists, insert adjustment transaction and sync account balance
    if (autoAdjust && Math.abs(diff) > 0.001) {
      const isPositive = diff > 0;
      await db.insert(transactions).values({
        householdId,
        accountId,
        type: isPositive ? "income" : "expense",
        amount: String(Math.abs(diff)),
        currency: "USD",
        description: `Ajuste por conciliación bancaria (${entry.id.slice(0, 6)})`,
        date: new Date(date),
        status: "reconciled",
        createdBy: authRes.userId,
      });

      await db
        .update(accounts)
        .set({
          balance: actualBalance,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId));
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("[POST reconciliation]", error);
    return NextResponse.json({ error: "Error al registrar conciliación" }, { status: 500 });
  }
}
