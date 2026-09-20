import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { accounts, transactions } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const cardPaymentSchema = z.object({
  fromAccountId: z.string().min(1, "La cuenta de origen es obligatoria"),
  cardAccountId: z.string().min(1, "La tarjeta de crédito es obligatoria"),
  amount: z.string().min(1, "El monto es obligatorio"),
  date: z.string(),
  description: z.string().optional(),
});

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
    const parsed = cardPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { fromAccountId, cardAccountId, amount, date, description } = parsed.data;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    const card = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, cardAccountId), eq(accounts.householdId, householdId)),
    });

    if (!card || card.type !== "credit") {
      return NextResponse.json({ error: "La cuenta de destino no es una tarjeta de crédito válida" }, { status: 400 });
    }

    // 1. Create transfer / payment transaction
    const [tx] = await db
      .insert(transactions)
      .values({
        householdId,
        accountId: fromAccountId,
        toAccountId: cardAccountId,
        type: "transfer",
        amount,
        currency: card.currency,
        description: description || `Pago de tarjeta de crédito: ${card.name}`,
        date: new Date(date),
        status: "cleared",
        createdBy: authRes.userId,
      })
      .returning();

    // 2. Decrease paying account balance
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} - ${numAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, fromAccountId));

    // 3. Increase credit card balance (reducing debt) and update available credit
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${numAmount}`,
        availableCredit: sql`LEAST(${accounts.creditLimit}, COALESCE(${accounts.availableCredit}, 0) + ${numAmount})`,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, cardAccountId));

    return NextResponse.json({ transaction: tx, success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST card payment]", error);
    return NextResponse.json({ error: "Error al registrar pago de tarjeta" }, { status: 500 });
  }
}
