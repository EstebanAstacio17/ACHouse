import { auth } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import { householdMembers } from "@achouse/db/schema";
import { eq, and } from "drizzle-orm";
import type { MemberRole } from "@achouse/types";

export type AuthContext = {
  userId: string;
  member: typeof householdMembers.$inferSelect;
  role: MemberRole;
};

export async function getHouseholdAuth(householdId: string): Promise<AuthContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const member = await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.clerkUserId, userId),
        eq(householdMembers.isActive, true)
      ),
    });

    if (!member) return null;

    return {
      userId,
      member,
      role: member.role as MemberRole,
    };
  } catch (error) {
    console.error("[getHouseholdAuth error]", error);
    return null;
  }
}

export async function requireRole(
  householdId: string,
  allowedRoles: MemberRole[]
): Promise<AuthContext | { error: string; status: number }> {
  const ctx = await getHouseholdAuth(householdId);
  if (!ctx) {
    return { error: "No tienes acceso a este hogar o sesión no válida", status: 403 };
  }

  if (!allowedRoles.includes(ctx.role)) {
    return { error: "No tienes permisos suficientes para realizar esta acción", status: 403 };
  }

  return ctx;
}
