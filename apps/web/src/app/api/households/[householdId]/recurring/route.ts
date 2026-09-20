import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { transactions, accounts, categories } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull } from "drizzle-orm";

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
    const list = await db.query.transactions.findMany({
      where: and(
        eq(transactions.householdId, householdId),
        eq(transactions.isRecurring, true),
        isNull(transactions.deletedAt)
      ),
      orderBy: (t, { desc }) => [desc(t.date)],
      with: {
        account: true,
        category: true,
      },
    });

    return NextResponse.json({ recurring: list });
  } catch (error) {
    console.error("[GET recurring]", error);
    return NextResponse.json({ error: "Error al cargar transacciones recurrentes" }, { status: 500 });
  }
}
