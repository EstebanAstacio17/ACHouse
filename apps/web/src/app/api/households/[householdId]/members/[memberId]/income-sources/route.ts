import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { memberIncomeSources, householdMembers } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const incomeSourceSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["job", "business", "project"]),
  expectedMonthlyAmount: z.string().min(1, "El monto es obligatorio"),
  currency: z.string().default("USD"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ householdId: string; memberId: string }> }
) {
  const { householdId, memberId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor", "viewer"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const sources = await db.query.memberIncomeSources.findMany({
      where: and(
        eq(memberIncomeSources.memberId, memberId),
        eq(memberIncomeSources.isActive, true)
      ),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[GET income-sources]", error);
    return NextResponse.json({ error: "Error al cargar fuentes de ingreso" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ householdId: string; memberId: string }> }
) {
  const { householdId, memberId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const body = await req.json();
    const parsed = incomeSourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, type, expectedMonthlyAmount, currency } = parsed.data;

    const [source] = await db
      .insert(memberIncomeSources)
      .values({
        memberId,
        name,
        type,
        expectedMonthlyAmount,
        currency,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("[POST income-sources]", error);
    return NextResponse.json({ error: "Error al crear fuente de ingreso" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ householdId: string; memberId: string }> }
) {
  const { householdId, memberId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("id");

  if (!sourceId) {
    return NextResponse.json({ error: "ID de fuente requerido" }, { status: 400 });
  }

  try {
    await db
      .update(memberIncomeSources)
      .set({ isActive: false })
      .where(
        and(
          eq(memberIncomeSources.id, sourceId),
          eq(memberIncomeSources.memberId, memberId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE income-sources]", error);
    return NextResponse.json({ error: "Error al eliminar fuente de ingreso" }, { status: 500 });
  }
}
