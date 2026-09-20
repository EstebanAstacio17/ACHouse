import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { projects, projectTransactions, transactions } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().nullable().optional(),
  budget: z.string().nullable().optional(),
  currency: z.string().default("USD"),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
  businessId: z.string().nullable().optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
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
    const list = await db.query.projects.findMany({
      where: and(
        eq(projects.householdId, householdId),
        isNull(projects.deletedAt)
      ),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
      with: {
        member: true,
        business: true,
      },
    });

    // Calculate spent amount & budget progress
    const enriched = await Promise.all(
      list.map(async (p) => {
        const mainTx = await db.query.transactions.findMany({
          where: and(
            eq(transactions.householdId, householdId),
            eq(transactions.projectId, p.id),
            isNull(transactions.deletedAt)
          ),
        });

        const pTx = await db.query.projectTransactions.findMany({
          where: eq(projectTransactions.projectId, p.id),
        });

        const spent =
          mainTx.filter((t) => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount), 0) +
          pTx.filter((t) => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount), 0);

        const budgetNum = p.budget ? parseFloat(p.budget) : 0;
        const progressPct = budgetNum > 0 ? ((spent / budgetNum) * 100).toFixed(1) : "0.0";
        const isOverBudget = budgetNum > 0 && spent > budgetNum;

        return {
          ...p,
          spent,
          progressPct: parseFloat(progressPct),
          isOverBudget,
          transactionCount: mainTx.length + pTx.length,
        };
      })
    );

    return NextResponse.json({ projects: enriched });
  } catch (error) {
    console.error("[GET projects]", error);
    return NextResponse.json({ error: "Error al cargar proyectos" }, { status: 500 });
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
    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    const [project] = await db
      .insert(projects)
      .values({
        householdId,
        name: d.name,
        description: d.description || null,
        budget: d.budget || null,
        currency: d.currency || "USD",
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        memberId: d.memberId || null,
        businessId: d.businessId || null,
        status: d.status || "active",
      })
      .returning();

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("[POST project]", error);
    return NextResponse.json({ error: "Error al crear proyecto" }, { status: 500 });
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
    const { id, name, description, budget, currency, startDate, endDate, memberId, businessId, status } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de proyecto requerido" }, { status: 400 });
    }

    const [updated] = await db
      .update(projects)
      .set({
        name,
        description,
        budget,
        currency,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        memberId: memberId || null,
        businessId: businessId || null,
        status: status || undefined,
      })
      .where(and(eq(projects.id, id), eq(projects.householdId, householdId)))
      .returning();

    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error("[PUT project]", error);
    return NextResponse.json({ error: "Error al actualizar proyecto" }, { status: 500 });
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
    return NextResponse.json({ error: "ID de proyecto requerido" }, { status: 400 });
  }

  try {
    await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.householdId, householdId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE project]", error);
    return NextResponse.json({ error: "Error al eliminar proyecto" }, { status: 500 });
  }
}
