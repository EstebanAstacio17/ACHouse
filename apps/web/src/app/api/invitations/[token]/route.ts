import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import { householdInvitations, householdMembers, households } from "@achouse/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const invite = await db.query.householdInvitations.findFirst({
      where: eq(householdInvitations.token, token),
      with: {
        household: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `La invitación ya fue ${invite.status}` }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "La invitación ha expirado" }, { status: 400 });
    }

    return NextResponse.json({
      invitation: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        householdId: invite.householdId,
        householdName: invite.household?.name ?? "Hogar",
      },
    });
  } catch (error) {
    console.error("[GET invitation token]", error);
    return NextResponse.json({ error: "Error al validar la invitación" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión para aceptar la invitación" }, { status: 401 });
  }

  try {
    const invite = await db.query.householdInvitations.findFirst({
      where: eq(householdInvitations.token, token),
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `La invitación ya fue ${invite.status}` }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "La invitación ha expirado" }, { status: 400 });
    }

    // Check if user is already a member
    const existingMember = await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.householdId, invite.householdId),
        eq(householdMembers.clerkUserId, userId)
      ),
    });

    if (existingMember) {
      // Re-activate if inactive
      if (!existingMember.isActive) {
        await db
          .update(householdMembers)
          .set({ isActive: true, role: invite.role })
          .where(eq(householdMembers.id, existingMember.id));
      }
    } else {
      // Check if there is a pending member created for this invitation
      const pendingMember = await db.query.householdMembers.findFirst({
        where: and(
          eq(householdMembers.householdId, invite.householdId),
          eq(householdMembers.clerkUserId, `pending_${token}`)
        ),
      });

      if (pendingMember) {
        await db
          .update(householdMembers)
          .set({
            clerkUserId: userId,
            displayName:
              `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
              pendingMember.displayName ||
              user.username ||
              "Nuevo Miembro",
            avatarUrl: user.imageUrl || pendingMember.avatarUrl,
            role: invite.role,
            isActive: true,
          })
          .where(eq(householdMembers.id, pendingMember.id));
      } else {
        // Create new member
        await db.insert(householdMembers).values({
          householdId: invite.householdId,
          clerkUserId: userId,
          role: invite.role,
          displayName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "Nuevo Miembro",
          avatarUrl: user.imageUrl,
          isActive: true,
        });
      }
    }

    // Mark invitation as accepted
    await db
      .update(householdInvitations)
      .set({ status: "accepted" })
      .where(eq(householdInvitations.id, invite.id));

    const res = NextResponse.json({ success: true, householdId: invite.householdId });
    res.cookies.set("household_id", invite.householdId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (error) {
    console.error("[POST accept invitation]", error);
    return NextResponse.json({ error: "Error al aceptar la invitación" }, { status: 500 });
  }
}
