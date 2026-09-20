import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { accounts, transactions } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull, sql } from "drizzle-orm";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(60),
  type: z.enum(["checking", "savings", "credit", "cash"]),
  balance: z.string().default("0"),
  currency: z.string().default("USD"),
  creditLimit: z.string().nullable().optional(),
  availableCredit: z.string().nullable().optional(),
  statementDay: z.number().int().min(1).max(31).nullable().optional(),
  paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
  minimumPayment: z.string().nullable().optional(),
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
    const list = await db.query.accounts.findMany({
      where: and(
        eq(accounts.householdId, householdId),
        eq(accounts.isActive, true),
        isNull(accounts.deletedAt)
      ),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return NextResponse.json({ accounts: list });
  } catch (error) {
    console.error("[GET accounts]", error);
    return NextResponse.json({ error: "Error al cargar cuentas" }, { status: 500 });
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
    const parsed = accountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const [account] = await db
      .insert(accounts)
      .values({
        householdId,
        name: d.name,
        type: d.type,
        balance: d.balance || "0",
        currency: d.currency || "USD",
        creditLimit: d.type === "credit" ? d.creditLimit || null : null,
        availableCredit: d.type === "credit" ? (d.availableCredit || d.creditLimit || null) : null,
        statementDay: d.statementDay || null,
        paymentDueDay: d.paymentDueDay || null,
        minimumPayment: d.minimumPayment || null,
      })
      .returning();

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("[POST account]", error);
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
  }
}

export async function PUT(
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
    const { id, name, type, balance, currency, creditLimit, availableCredit, statementDay, paymentDueDay, minimumPayment } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de cuenta requerido" }, { status: 400 });
    }

    const [updated] = await db
      .update(accounts)
      .set({
        name,
        type,
        balance,
        currency,
        creditLimit: type === "credit" ? creditLimit : null,
        availableCredit: type === "credit" ? availableCredit : null,
        statementDay: statementDay || null,
        paymentDueDay: paymentDueDay || null,
        minimumPayment: minimumPayment || null,
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)))
      .returning();

    return NextResponse.json({ account: updated });
  } catch (error) {
    console.error("[PUT account]", error);
    return NextResponse.json({ error: "Error al actualizar cuenta" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  try {
    await db
      .update(accounts)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE account]", error);
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
