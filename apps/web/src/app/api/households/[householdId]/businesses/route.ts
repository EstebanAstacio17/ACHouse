import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { businesses, businessTransactions, transactions } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const businessSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
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
    const list = await db.query.businesses.findMany({
      where: and(
        eq(businesses.householdId, householdId),
        eq(businesses.isActive, true),
        isNull(businesses.deletedAt)
      ),
      orderBy: (b, { desc }) => [desc(b.createdAt)],
    });

    // Calculate P&L for each business from linked transactions
    const enrichedBusinesses = await Promise.all(
      list.map(async (b) => {
        // Find transactions in main transactions or business_transactions
        const mainTx = await db.query.transactions.findMany({
          where: and(
            eq(transactions.householdId, householdId),
            eq(transactions.businessId, b.id),
            isNull(transactions.deletedAt)
          ),
        });

        const bTx = await db.query.businessTransactions.findMany({
          where: and(
            eq(businessTransactions.businessId, b.id),
            isNull(businessTransactions.deletedAt)
          ),
        });

        const totalIncome =
          mainTx.filter((t) => t.type === "income").reduce((acc, t) => acc + parseFloat(t.amount), 0) +
          bTx.filter((t) => t.type === "income").reduce((acc, t) => acc + parseFloat(t.amount), 0);

        const totalExpense =
          mainTx.filter((t) => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount), 0) +
          bTx.filter((t) => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount), 0);

        const netProfit = totalIncome - totalExpense;
        const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : "0.0";

        return {
          ...b,
          income: totalIncome,
          expenses: totalExpense,
          netProfit,
          profitMargin: parseFloat(profitMargin),
          transactionCount: mainTx.length + bTx.length,
        };
      })
    );

    return NextResponse.json({ businesses: enrichedBusinesses });
  } catch (error) {
    console.error("[GET businesses]", error);
    return NextResponse.json({ error: "Error al cargar negocios" }, { status: 500 });
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
    const parsed = businessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, type, currency } = parsed.data;

    const [business] = await db
      .insert(businesses)
      .values({
        householdId,
        name,
        description: description || null,
        type: type || "Comercio",
        currency: currency || "USD",
        isActive: true,
      })
      .returning();

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error("[POST business]", error);
    return NextResponse.json({ error: "Error al crear negocio" }, { status: 500 });
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
    const { id, name, description, type, currency, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de negocio requerido" }, { status: 400 });
    }

    const [updated] = await db
      .update(businesses)
      .set({
        name,
        description,
        type,
        currency,
        isActive: isActive !== undefined ? isActive : undefined,
      })
      .where(and(eq(businesses.id, id), eq(businesses.householdId, householdId)))
      .returning();

    return NextResponse.json({ business: updated });
  } catch (error) {
    console.error("[PUT business]", error);
    return NextResponse.json({ error: "Error al actualizar negocio" }, { status: 500 });
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
    return NextResponse.json({ error: "ID de negocio requerido" }, { status: 400 });
  }

  try {
    await db
      .update(businesses)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(businesses.id, id), eq(businesses.householdId, householdId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE business]", error);
    return NextResponse.json({ error: "Error al eliminar negocio" }, { status: 500 });
  }
}
