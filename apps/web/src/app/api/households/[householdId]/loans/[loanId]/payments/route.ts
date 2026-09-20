import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { loans, loanPayments, transactions, accounts } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.string().min(1, "El monto es obligatorio"),
  principalPaid: z.string().default("0"),
  interestPaid: z.string().default("0"),
  date: z.string(),
  accountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ householdId: string; loanId: string }> }
) {
  const { householdId, loanId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor", "viewer"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const list = await db.query.loanPayments.findMany({
      where: eq(loanPayments.loanId, loanId),
      orderBy: (p, { desc }) => [desc(p.date)],
      with: {
        transaction: true,
      },
    });

    return NextResponse.json({ payments: list });
  } catch (error) {
    console.error("[GET loan payments]", error);
    return NextResponse.json({ error: "Error al cargar pagos" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ householdId: string; loanId: string }> }
) {
  const { householdId, loanId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const numAmount = parseFloat(d.amount);
    const numPrincipal = parseFloat(d.principalPaid) || numAmount;
    const numInterest = parseFloat(d.interestPaid) || 0;

    const loan = await db.query.loans.findFirst({
      where: and(eq(loans.id, loanId), eq(loans.householdId, householdId)),
    });

    if (!loan) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
    }

    // 1. Create linked transaction if account specified
    let transactionId: string | null = null;
    if (d.accountId) {
      const [tx] = await db
        .insert(transactions)
        .values({
          householdId,
          accountId: d.accountId,
          type: "expense",
          amount: d.amount,
          currency: loan.currency,
          description: `Pago cuota préstamo: ${loan.name}`,
          date: new Date(d.date),
          status: "cleared",
          createdBy: authRes.userId,
        })
        .returning();

      if (tx) {
        transactionId = tx.id;
        // Decrease account balance
        await db
          .update(accounts)
          .set({
            balance: sql`${accounts.balance} - ${numAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, d.accountId));
      }
    }

    // 2. Insert loan payment
    const [payment] = await db
      .insert(loanPayments)
      .values({
        loanId,
        transactionId: transactionId || null,
        amount: d.amount,
        principalPaid: String(numPrincipal),
        interestPaid: String(numInterest),
        date: new Date(d.date),
        notes: d.notes || null,
      })
      .returning();

    // 3. Update loan remaining balance
    await db
      .update(loans)
      .set({
        remainingBalance: sql`GREATEST(0, ${loans.remainingBalance} - ${numPrincipal})`,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, loanId));

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("[POST loan payment]", error);
    return NextResponse.json({ error: "Error al registrar pago de préstamo" }, { status: 500 });
  }
}
