import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { households, householdMembers } from "@achouse/db/schema";
import { z } from "zod";

const createHouseholdSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  currency: z.string().length(3),
  timezone: z.string(),
});

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createHouseholdSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, currency, timezone } = parsed.data;

  try {
    // Create household
    const [household] = await db
      .insert(households)
      .values({ name, defaultCurrency: currency, timezone })
      .returning();

    if (!household) {
      throw new Error("Failed to create household");
    }

    // Add creator as admin member
    await db.insert(householdMembers).values({
      householdId: household.id,
      clerkUserId: userId,
      role: "admin",
      displayName: "Admin",
    });

    return NextResponse.json({ household }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/households]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const members = await db.query.householdMembers.findMany({
      where: (m, { eq, and }) =>
        and(eq(m.clerkUserId, userId), eq(m.isActive, true)),
      with: { household: true },
    });

    const myHouseholds = members.map((m) => ({
      ...m.household,
      role: m.role,
      memberId: m.id,
    }));

    return NextResponse.json({ households: myHouseholds });
  } catch (error) {
    console.error("[GET /api/households]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
