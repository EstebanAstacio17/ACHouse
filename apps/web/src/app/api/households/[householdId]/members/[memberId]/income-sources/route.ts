import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { memberIncomeSources, householdMembers, businesses } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { syncBusinessCategories } from "@/lib/actions/entities";
import { z } from "zod";

const incomeSourceSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["job", "business", "project"]),
  expectedMonthlyAmount: z.string().min(1, "El monto es obligatorio"),
  currency: z.string().default("DOP"),
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
    const cleanName = name.trim();

    const [source] = await db
      .insert(memberIncomeSources)
      .values({
        memberId,
        name: cleanName,
        type,
        expectedMonthlyAmount,
        currency,
        isActive: true,
      })
      .returning();

    // Auto-create / sync Business
    try {
      const existingBiz = await db.query.businesses.findFirst({
        where: and(
          eq(businesses.householdId, householdId),
          isNull(businesses.deletedAt),
          eq(businesses.name, cleanName)
        ),
      });

      if (!existingBiz) {
        await db.insert(businesses).values({
          id: createId(),
          householdId,
          name: cleanName,
          type: type === "job" ? "Empleo / Nómina" : type === "project" ? "Inversión / Proyecto" : "Comercio",
          currency: currency || "DOP",
          isActive: true,
        });
      }

      await syncBusinessCategories(householdId);
    } catch (bizErr) {
      console.warn("[income-sources route] Could not auto-sync business/categories:", bizErr);
    }

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
