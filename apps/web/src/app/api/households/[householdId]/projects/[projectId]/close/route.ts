import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { projects, projectTransactions, transactions } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ householdId: string; projectId: string }> }
) {
  const { householdId, projectId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.householdId, householdId)
      ),
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const mainTx = await db.query.transactions.findMany({
      where: and(
        eq(transactions.householdId, householdId),
        eq(transactions.projectId, projectId),
        isNull(transactions.deletedAt)
      ),
    });

    const pTx = await db.query.projectTransactions.findMany({
      where: eq(projectTransactions.projectId, projectId),
    });

    const totalSpent =
      mainTx.filter((t) => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount), 0) +
      pTx.filter((t) => t.type === "expense").reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const budget = project.budget ? parseFloat(project.budget) : 0;
    const variance = budget - totalSpent;

    const [closedProject] = await db
      .update(projects)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    return NextResponse.json({
      project: closedProject,
      summary: {
        budget,
        totalSpent,
        variance,
        isUnderBudget: variance >= 0,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[POST close project]", error);
    return NextResponse.json({ error: "Error al cerrar el proyecto" }, { status: 500 });
  }
}
