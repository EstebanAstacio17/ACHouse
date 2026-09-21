import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import { householdMembers, memberIncomeSources, transactions } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull, sql } from "drizzle-orm";

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
    const members = await db.query.householdMembers.findMany({
      where: and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.isActive, true)
      ),
      with: {
        incomeSources: true,
      },
    });

    // Auto-resolve real names for any member whose displayName was defaulted to their role
    try {
      const client = await clerkClient();
      for (const m of members) {
        const lower = (m.displayName || "").trim().toLowerCase();
        if (
          !m.displayName ||
          lower === "administrador" ||
          lower === "admin" ||
          lower === "colaborador" ||
          lower === "contributor" ||
          lower === "lector" ||
          lower === "viewer" ||
          lower === "miembro" ||
          lower === "nuevo miembro"
        ) {
          try {
            const clerkUser = await client.users.getUser(m.clerkUserId);
            if (clerkUser) {
              const realName =
                [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
                clerkUser.username ||
                clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0];
              if (realName) {
                await db
                  .update(householdMembers)
                  .set({ displayName: realName })
                  .where(eq(householdMembers.id, m.id));
                m.displayName = realName;
              }
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    // Calculate aggregated income and expenses per member
    const enrichedMembers = await Promise.all(
      members.map(async (m) => {
        const memberTx = await db.query.transactions.findMany({
          where: and(
            eq(transactions.householdId, householdId),
            eq(transactions.memberId, m.id),
            isNull(transactions.deletedAt)
          ),
        });

        const totalIncome = memberTx
          .filter((t) => t.type === "income")
          .reduce((acc, t) => acc + parseFloat(t.amount), 0);

        const totalExpense = memberTx
          .filter((t) => t.type === "expense")
          .reduce((acc, t) => acc + parseFloat(t.amount), 0);

        return {
          ...m,
          totalIncome,
          totalExpense,
          netBalance: totalIncome - totalExpense,
        };
      })
    );

    return NextResponse.json({ members: enrichedMembers });
  } catch (error) {
    console.error("[GET members]", error);
    return NextResponse.json({ error: "Error al cargar integrantes" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const body = await req.json();
    const { memberId, role, displayName, isActive } = body;

    if (!memberId) {
      return NextResponse.json({ error: "ID de integrante requerido" }, { status: 400 });
    }

    const [updated] = await db
      .update(householdMembers)
      .set({
        role: role !== undefined ? role : undefined,
        displayName: displayName !== undefined ? displayName : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      })
      .where(
        and(
          eq(householdMembers.id, memberId),
          eq(householdMembers.householdId, householdId)
        )
      )
      .returning();

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error("[PUT member]", error);
    return NextResponse.json({ error: "Error al actualizar integrante" }, { status: 500 });
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
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "ID de integrante requerido" }, { status: 400 });
  }

  try {
    await db
      .update(householdMembers)
      .set({ isActive: false })
      .where(
        and(
          eq(householdMembers.id, memberId),
          eq(householdMembers.householdId, householdId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE member]", error);
    return NextResponse.json({ error: "Error al remover integrante" }, { status: 500 });
  }
}
