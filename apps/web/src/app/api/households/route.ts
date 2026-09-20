import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@achouse/db";
import { households, householdMembers, categories, accounts } from "@achouse/db/schema";
import { z } from "zod";

const createHouseholdSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  currency: z.string().length(3),
  timezone: z.string(),
});

const DEFAULT_CATEGORIES = [
  // Ingresos
  { name: "Salario", type: "income" as const, color: "#22c55e", icon: "banknote" },
  { name: "Negocios / Ventas", type: "income" as const, color: "#14b8a6", icon: "building" },
  { name: "Inversiones", type: "income" as const, color: "#6366f1", icon: "trending-up" },
  { name: "Otros Ingresos", type: "income" as const, color: "#8b5cf6", icon: "plus-circle" },
  // Gastos
  { name: "Alimentación y Supermercado", type: "expense" as const, color: "#f97316", icon: "shopping-cart" },
  { name: "Vivienda y Alquiler", type: "expense" as const, color: "#8b5cf6", icon: "home" },
  { name: "Servicios (Luz, Agua, Internet)", type: "expense" as const, color: "#84cc16", icon: "zap" },
  { name: "Transporte y Gasolina", type: "expense" as const, color: "#06b6d4", icon: "car" },
  { name: "Salud y Medicina", type: "expense" as const, color: "#ef4444", icon: "heart-pulse" },
  { name: "Entretenimiento y Ocio", type: "expense" as const, color: "#ec4899", icon: "film" },
  { name: "Educación", type: "expense" as const, color: "#3b82f6", icon: "graduation-cap" },
  { name: "Otros Gastos", type: "expense" as const, color: "#64748b", icon: "tag" },
];

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
    // 1. Create household
    const [household] = await db
      .insert(households)
      .values({ name, defaultCurrency: currency, timezone })
      .returning();

    if (!household) {
      throw new Error("Failed to create household");
    }

    // 2. Add creator as admin member
    await db.insert(householdMembers).values({
      householdId: household.id,
      clerkUserId: userId,
      role: "admin",
      displayName: "Administrador",
    });

    // 3. Seed default categories
    await db.insert(categories).values(
      DEFAULT_CATEGORIES.map((c) => ({
        householdId: household.id,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
      }))
    );

    // 4. Seed default account
    await db.insert(accounts).values({
      householdId: household.id,
      name: "Cuenta Principal",
      type: "checking",
      balance: "0",
      currency: currency,
    });

    const res = NextResponse.json({ household }, { status: 201 });
    res.cookies.set("household_id", household.id, {
      path: "/",
      sameSite: "lax",
      maxAge: 31536000, // 1 year
    });

    return res;
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

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get("household_id")?.value;

    const res = NextResponse.json({
      households: myHouseholds,
      activeHouseholdId: existingCookie || (myHouseholds[0]?.id ?? null),
    });

    // If no active household cookie was set, but user has a household, auto-set cookie
    if (!existingCookie && myHouseholds.length > 0 && myHouseholds[0]?.id) {
      res.cookies.set("household_id", myHouseholds[0].id, {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
      });
    }

    return res;
  } catch (error) {
    console.error("[GET /api/households]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const householdId = body.householdId || cookieStore.get("household_id")?.value;
    if (!householdId) {
      return NextResponse.json({ error: "No active household" }, { status: 400 });
    }

    const { eq } = await import("drizzle-orm");
    const [updated] = await db
      .update(households)
      .set({
        name: body.name,
        defaultCurrency: body.currency,
        timezone: body.timezone,
        updatedAt: new Date(),
      })
      .where(eq(households.id, householdId))
      .returning();

    return NextResponse.json({ success: true, household: updated });
  } catch (error) {
    console.error("[PATCH /api/households]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
