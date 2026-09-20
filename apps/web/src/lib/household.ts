import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@achouse/db";
import { households, householdMembers } from "@achouse/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Returns the active household ID for the current request.
 * Prioritizes the `household_id` cookie.
 * If the cookie is absent, queries the database for the user's first active household membership.
 */
export async function getActiveHouseholdId(): Promise<string> {
  const cookieStore = await cookies();
  const cookieHid = cookieStore.get("household_id")?.value;
  if (cookieHid) {
    return cookieHid;
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Fallback to database lookup
  const member = await db.query.householdMembers.findFirst({
    where: and(
      eq(householdMembers.clerkUserId, userId),
      eq(householdMembers.isActive, true)
    ),
  });

  if (!member) {
    throw new Error("No active household found for user");
  }

  return member.householdId;
}

export async function getActiveHousehold() {
  try {
    const householdId = await getActiveHouseholdId();
    const h = await db.query.households.findFirst({
      where: eq(households.id, householdId),
    });
    return h || null;
  } catch {
    return null;
  }
}
