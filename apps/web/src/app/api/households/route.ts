import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@achouse/db";
import { households, householdMembers, categories, accounts, householdInvitations } from "@achouse/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const createHouseholdSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  currency: z.string().length(3),
  timezone: z.string(),
  country: z.string().optional(),
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

  const { name, currency, timezone, country } = parsed.data;

  try {
    // 1. Create household
    const [household] = await db
      .insert(households)
      .values({
        name,
        defaultCurrency: currency,
        timezone,
        country: country || null,
      })
      .returning();

    if (!household) {
      throw new Error("Failed to create household");
    }

    // 2. Add creator as admin member with real name
    const user = await currentUser();
    const creatorName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.username ||
        user.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
        "Miembro"
      : "Miembro";

    await db.insert(householdMembers).values({
      householdId: household.id,
      clerkUserId: userId,
      role: "admin",
      displayName: creatorName,
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

    let myHouseholds = members.map((m) => ({
      ...m.household,
      role: m.role,
      memberId: m.id,
    }));

    const cookieStore = await cookies();
    let existingCookie = cookieStore.get("household_id")?.value;

    // If user has no active household memberships yet, check if they have a pending invitation!
    if (myHouseholds.length === 0) {
      const user = await currentUser();
      const userEmails = (user?.emailAddresses || [])
        .map((e) => e.emailAddress.trim().toLowerCase())
        .filter(Boolean);

      const pendingInviteToken = cookieStore.get("invite_token")?.value;

      let invite = null;
      if (pendingInviteToken) {
        invite = await db.query.householdInvitations.findFirst({
          where: and(
            eq(householdInvitations.token, pendingInviteToken),
            eq(householdInvitations.status, "pending")
          ),
          with: { household: true },
        });
      }

      if (!invite && userEmails.length > 0) {
        invite = await db.query.householdInvitations.findFirst({
          where: (inv, { inArray, and, eq }) =>
            and(inArray(inv.email, userEmails), eq(inv.status, "pending")),
          with: { household: true },
        });
      }

      // If an invitation was found, automatically claim & connect this user!
      if (invite && new Date(invite.expiresAt) > new Date()) {
        const token = invite.token;
        const pendingMember = await db.query.householdMembers.findFirst({
          where: and(
            eq(householdMembers.householdId, invite.householdId),
            eq(householdMembers.clerkUserId, `pending_${token}`)
          ),
        });

        const realName =
          `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
          user?.username ||
          user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
          pendingMember?.displayName ||
          "Nuevo Miembro";

        let memberId = "";
        if (pendingMember) {
          await db
            .update(householdMembers)
            .set({
              clerkUserId: userId,
              displayName: realName,
              avatarUrl: user?.imageUrl || pendingMember.avatarUrl,
              role: invite.role,
              isActive: true,
            })
            .where(eq(householdMembers.id, pendingMember.id));
          memberId = pendingMember.id;
        } else {
          const [newMem] = await db
            .insert(householdMembers)
            .values({
              householdId: invite.householdId,
              clerkUserId: userId,
              role: invite.role,
              displayName: realName,
              avatarUrl: user?.imageUrl,
              isActive: true,
            })
            .returning();
          memberId = newMem.id;
        }

        await db
          .update(householdInvitations)
          .set({ status: "accepted" })
          .where(eq(householdInvitations.id, invite.id));

        myHouseholds = [
          {
            ...invite.household,
            role: invite.role,
            memberId,
          },
        ];
        existingCookie = invite.householdId;
      }
    }

    const res = NextResponse.json({
      households: myHouseholds,
      activeHouseholdId: existingCookie || (myHouseholds[0]?.id ?? null),
    });

    // If no active household cookie was set, but user has a household, auto-set cookie
    if (myHouseholds.length > 0 && myHouseholds[0]?.id) {
      res.cookies.set("household_id", existingCookie || myHouseholds[0].id, {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
      });
      res.cookies.delete("invite_token");
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

    const { eq, and } = await import("drizzle-orm");

    // BOLA/IDOR protection: Check if user is a member of this household AND is an admin
    const member = await db.query.householdMembers.findFirst({
      where: (m) => and(
        eq(m.householdId, householdId),
        eq(m.clerkUserId, userId),
        eq(m.role, "admin"),
        eq(m.isActive, true)
      )
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden: Not an admin of this household" }, { status: 403 });
    }

    const [updated] = await db
      .update(households)
      .set({
        name: body.name,
        defaultCurrency: body.currency,
        timezone: body.timezone,
        ...(body.country !== undefined && { country: body.country }),
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
