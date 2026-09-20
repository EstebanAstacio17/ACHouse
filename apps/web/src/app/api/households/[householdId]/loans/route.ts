import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { loans, loanPayments, householdMembers, accounts } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const loanSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  lenderType: z.enum(["bank", "person", "internal_member"]),
  lenderName: z.string().nullable().optional(),
  lenderMemberId: z.string().nullable().optional(),
  borrowerMemberId: z.string().nullable().optional(),
  principalAmount: z.string().min(1, "El monto principal es obligatorio"),
  remainingBalance: z.string().optional(),
  interestRate: z.string().default("0"),
  interestType: z.enum(["fixed", "variable", "none"]).default("fixed"),
  monthlyPayment: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  currency: z.string().default("USD"),
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
    const list = await db.query.loans.findMany({
      where: and(
        eq(loans.householdId, householdId),
        eq(loans.isActive, true),
        isNull(loans.deletedAt)
      ),
      orderBy: (l, { desc }) => [desc(l.createdAt)],
      with: {
        payments: true,
      },
    });

    const enriched = list.map((loan) => {
      const principal = parseFloat(loan.principalAmount);
      const remaining = parseFloat(loan.remainingBalance);
      const paid = Math.max(0, principal - remaining);
      const progressPct = principal > 0 ? ((paid / principal) * 100).toFixed(1) : "0.0";

      return {
        ...loan,
        principalPaid: paid,
        progressPct: parseFloat(progressPct),
        paymentsCount: loan.payments?.length ?? 0,
      };
    });

    return NextResponse.json({ loans: enriched });
  } catch (error) {
    console.error("[GET loans]", error);
    return NextResponse.json({ error: "Error al cargar préstamos" }, { status: 500 });
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
    const parsed = loanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    const [loan] = await db
      .insert(loans)
      .values({
        householdId,
        name: d.name,
        lenderType: d.lenderType,
        lenderName: d.lenderName || null,
        lenderMemberId: d.lenderMemberId || null,
        borrowerMemberId: d.borrowerMemberId || null,
        principalAmount: d.principalAmount,
        remainingBalance: d.remainingBalance || d.principalAmount,
        interestRate: d.interestRate || "0",
        interestType: d.interestType || "fixed",
        monthlyPayment: d.monthlyPayment || null,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        accountId: d.accountId || null,
        currency: d.currency || "USD",
        isActive: true,
      })
      .returning();

    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    console.error("[POST loan]", error);
    return NextResponse.json({ error: "Error al registrar préstamo" }, { status: 500 });
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
    return NextResponse.json({ error: "ID de préstamo requerido" }, { status: 400 });
  }

  try {
    await db
      .update(loans)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(loans.id, id), eq(loans.householdId, householdId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE loan]", error);
    return NextResponse.json({ error: "Error al eliminar préstamo" }, { status: 500 });
  }
}
