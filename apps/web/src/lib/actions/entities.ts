"use server";

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import { categories, accounts, householdMembers, householdInvitations, businesses } from "@achouse/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getActiveHouseholdId } from "@/lib/household";

async function resolveBaseUrl(): Promise<string> {
  // 1. Check request headers from incoming request
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || "https";
    if (host && !host.includes("localhost")) {
      return `${proto}://${host}`;
    }
  } catch {
    // ignore
  }

  // 2. Check Vercel production deployment URLs
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 3. Check NEXT_PUBLIC_APP_URL
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl;
  }

  return envUrl || "http://localhost:3000";
}

async function getAuthContext() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const householdId = await getActiveHouseholdId();
  return { userId, householdId };
}

// ── Categories ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#6366f1"),
  icon: z.string().default("tag"),
  parentId: z.string().nullable().optional(),
});

export async function syncBusinessCategories(householdId: string) {
  try {
    const [bizList, existingCats] = await Promise.all([
      db.query.businesses.findMany({
        where: and(eq(businesses.householdId, householdId), isNull(businesses.deletedAt), eq(businesses.isActive, true)),
      }),
      db.query.categories.findMany({
        where: eq(categories.householdId, householdId),
      }),
    ]);

    for (const biz of bizList) {
      const cleanName = biz.name.trim();

      // 1. Check/create/restore Income category for business
      const existingIncome = existingCats.find(
        c => c.name.toLowerCase().trim() === cleanName.toLowerCase() && c.type === "income"
      );
      if (existingIncome) {
        if (existingIncome.deletedAt || !existingIncome.isActive || existingIncome.name !== cleanName) {
          await db
            .update(categories)
            .set({ deletedAt: null, isActive: true, name: cleanName, color: "#10b981", icon: "building-2" })
            .where(eq(categories.id, existingIncome.id));
        }
      } else {
        await db.insert(categories).values({
          id: createId(),
          householdId,
          name: cleanName,
          type: "income",
          color: "#10b981",
          icon: "building-2",
          isActive: true,
        });
      }

      // 2. Check/create/restore Expense category for business
      const existingExpense = existingCats.find(
        c => c.name.toLowerCase().trim() === cleanName.toLowerCase() && c.type === "expense"
      );
      if (existingExpense) {
        if (existingExpense.deletedAt || !existingExpense.isActive || existingExpense.name !== cleanName) {
          await db
            .update(categories)
            .set({ deletedAt: null, isActive: true, name: cleanName, color: "#6366f1", icon: "building-2" })
            .where(eq(categories.id, existingExpense.id));
        }
      } else {
        await db.insert(categories).values({
          id: createId(),
          householdId,
          name: cleanName,
          type: "expense",
          color: "#6366f1",
          icon: "building-2",
          isActive: true,
        });
      }
    }
  } catch (err) {
    console.error("Error in syncBusinessCategories:", err);
  }
}

export async function getCategories() {
  const { householdId } = await getAuthContext();
  await syncBusinessCategories(householdId);
  return db.query.categories.findMany({
    where: and(eq(categories.householdId, householdId), isNull(categories.deletedAt), eq(categories.isActive, true)),
    orderBy: (c, { asc }) => [asc(c.type), asc(c.name)],
  });
}

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const { householdId } = await getAuthContext();
  const parsed = categorySchema.parse(data);
  const [cat] = await db.insert(categories).values({ ...parsed, householdId, parentId: parsed.parentId ?? null }).returning();
  revalidatePath("/dashboard/categories");
  return { success: true, category: cat };
}

export async function updateCategory(id: string, data: Partial<z.infer<typeof categorySchema>>) {
  const { householdId } = await getAuthContext();
  const [updated] = await db
    .update(categories)
    .set(data)
    .where(and(eq(categories.id, id), eq(categories.householdId, householdId)))
    .returning();

  if (data.type && updated && !updated.parentId) {
    await db
      .update(categories)
      .set({ type: data.type })
      .where(and(eq(categories.parentId, id), eq(categories.householdId, householdId)));
  }

  revalidatePath("/dashboard/categories");
  return { success: true, category: updated };
}

export async function deleteCategory(id: string) {
  const { householdId } = await getAuthContext();
  await db
    .update(categories)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(categories.id, id), eq(categories.householdId, householdId)));

  await db
    .update(categories)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(categories.parentId, id), eq(categories.householdId, householdId)));

  revalidatePath("/dashboard/categories");
  return { success: true };
}

// ── Accounts ─────────────────────────────────────────────────────────────────

const accountSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["checking", "savings", "credit", "cash"]),
  balance: z.coerce.number().default(0),
  currency: z.string().length(3).default("DOP"),
  creditLimit: z.coerce.number().optional(),
  statementDay: z.coerce.number().min(1).max(31).optional(),
  paymentDueDay: z.coerce.number().min(1).max(31).optional(),
  minimumPayment: z.coerce.number().optional(),
});

export async function getAccounts() {
  const { householdId } = await getAuthContext();
  return db.query.accounts.findMany({
    where: and(eq(accounts.householdId, householdId), eq(accounts.isActive, true), isNull(accounts.deletedAt)),
    orderBy: (a, { asc }) => [asc(a.type), asc(a.name)],
  });
}

export async function createAccount(data: z.infer<typeof accountSchema>) {
  const { householdId } = await getAuthContext();
  const parsed = accountSchema.parse(data);
  const [acc] = await db.insert(accounts).values({
    householdId,
    name: parsed.name,
    type: parsed.type,
    balance: parsed.balance.toString(),
    currency: parsed.currency,
    creditLimit: parsed.creditLimit?.toString() ?? null,
    availableCredit: parsed.creditLimit?.toString() ?? null,
    statementDay: parsed.statementDay ?? null,
    paymentDueDay: parsed.paymentDueDay ?? null,
    minimumPayment: parsed.minimumPayment?.toString() ?? null,
    currentStatementBalance: "0",
  }).returning();
  revalidatePath("/dashboard/accounts");
  return { success: true, account: acc };
}

export async function updateAccount(id: string, data: Partial<z.infer<typeof accountSchema>>) {
  const { householdId } = await getAuthContext();
  await db.update(accounts).set({
    ...data,
    balance: data.balance !== undefined ? data.balance.toString() : undefined,
    creditLimit: data.creditLimit !== undefined ? data.creditLimit?.toString() : undefined,
    minimumPayment: data.minimumPayment !== undefined ? data.minimumPayment?.toString() : undefined,
    updatedAt: new Date(),
  }).where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)));
  revalidatePath("/dashboard/accounts");
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { householdId } = await getAuthContext();
  await db.update(accounts).set({ isActive: false, deletedAt: new Date() }).where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)));
  revalidatePath("/dashboard/accounts");
  return { success: true };
}

// ── Members ──────────────────────────────────────────────────────────────────

export async function getMembers() {
  const { userId, householdId } = await getAuthContext();
  const members = await db.query.householdMembers.findMany({
    where: and(eq(householdMembers.householdId, householdId), eq(householdMembers.isActive, true)),
    with: { incomeSources: true },
  });

  const invitations = await db.query.householdInvitations.findMany({
    where: and(
      eq(householdInvitations.householdId, householdId),
      eq(householdInvitations.status, "pending")
    ),
  });

  const isRoleOrGenericName = (name?: string | null) => {
    if (!name || !name.trim()) return true;
    const lower = name.trim().toLowerCase();
    return (
      lower === "administrador" ||
      lower === "admin" ||
      lower === "colaborador" ||
      lower === "contributor" ||
      lower === "lector" ||
      lower === "viewer" ||
      lower === "miembro" ||
      lower === "nuevo miembro"
    );
  };

  // 1. Auto-update current user if their name is currently a role or generic placeholder
  try {
    const user = await currentUser();
    if (user) {
      const realName =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.username ||
        user.emailAddresses?.[0]?.emailAddress?.split("@")[0];

      if (realName) {
        const currentMember = members.find((m) => m.clerkUserId === userId);
        if (currentMember && isRoleOrGenericName(currentMember.displayName)) {
          await db
            .update(householdMembers)
            .set({ displayName: realName })
            .where(eq(householdMembers.id, currentMember.id));
          currentMember.displayName = realName;
        }
      }
    }
  } catch (err) {
    console.error("[getMembers] Error auto-updating current user name from Clerk:", err);
  }

  // 2. Enrich members with email and pending status
  let client: any = null;
  try {
    client = await clerkClient();
  } catch {
    // ignore
  }

  const enrichedMembers = await Promise.all(
    members.map(async (m) => {
      let email: string | undefined = undefined;
      let isPendingInvite = false;
      let inviteToken: string | undefined = undefined;

      if (m.clerkUserId && m.clerkUserId.startsWith("pending_")) {
        const token = m.clerkUserId.replace("pending_", "");
        const inv = invitations.find((i) => i.token === token);
        email = inv?.email || undefined;
        isPendingInvite = true;
        inviteToken = token;
      } else if (m.clerkUserId) {
        if (client) {
          try {
            const clerkUser = await client.users.getUser(m.clerkUserId);
            if (clerkUser) {
              email = clerkUser.emailAddresses?.[0]?.emailAddress;
              if (isRoleOrGenericName(m.displayName)) {
                const name =
                  [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
                  clerkUser.username ||
                  email?.split("@")[0];
                if (name) {
                  await db
                    .update(householdMembers)
                    .set({ displayName: name })
                    .where(eq(householdMembers.id, m.id));
                  m.displayName = name;
                }
              }
            }
          } catch {
            // ignore individual fetch errors
          }
        }
      }

      return {
        ...m,
        email,
        isPendingInvite,
        inviteToken,
        isCurrentUser: m.clerkUserId === userId,
      };
    })
  );

  return enrichedMembers;
}

export async function inviteMember(data: {
  email: string;
  role: "admin" | "contributor" | "viewer";
  name?: string;
}) {
  const { userId, householdId } = await getAuthContext();
  const token = createId() + createId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const cleanEmail = data.email.trim().toLowerCase();
  const memberName = data.name?.trim() || cleanEmail.split("@")[0];

  // 1. Create invitation record
  const [invitation] = await db
    .insert(householdInvitations)
    .values({
      householdId,
      email: cleanEmail,
      role: data.role,
      token,
      invitedBy: userId,
      status: "pending",
      expiresAt,
    })
    .returning();

  // 2. Create pending member record so they exist immediately in the household and persist across reloads
  const [member] = await db
    .insert(householdMembers)
    .values({
      householdId,
      clerkUserId: `pending_${token}`,
      role: data.role,
      displayName: memberName,
      isActive: true,
    })
    .returning();

  // 3. Construct direct invitation URL (dynamically resolving production domain)
  const baseUrl = await resolveBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${token}`;

  // 4. Try sending invitation email via Clerk Backend API if available
  let emailSent = false;
  try {
    const client = await clerkClient();
    if ((client as any).invitations?.createInvitation) {
      await (client as any).invitations.createInvitation({
        emailAddress: cleanEmail,
        redirectUrl: inviteUrl,
        ignoreExisting: true,
      });
      emailSent = true;
    }
  } catch (clerkErr) {
    console.warn("[inviteMember] Clerk invitation email could not be sent:", clerkErr);
  }

  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/transactions");

  return {
    success: true,
    invitation,
    member: {
      id: member.id,
      displayName: member.displayName,
      role: member.role,
      email: cleanEmail,
      avatarUrl: null,
      isActive: true,
      isPendingInvite: true,
      inviteToken: token,
      incomeSources: [],
      monthlyIncome: 0,
      monthlyExpenses: 0,
    },
    inviteUrl,
    token,
    emailSent,
  };
}

export async function removeMember(memberId: string) {
  const { householdId } = await getAuthContext();
  const member = await db.query.householdMembers.findFirst({
    where: and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, householdId)),
  });

  if (!member) throw new Error("Integrante no encontrado");

  await db
    .update(householdMembers)
    .set({ isActive: false })
    .where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, householdId)));

  if (member.clerkUserId && member.clerkUserId.startsWith("pending_")) {
    const token = member.clerkUserId.replace("pending_", "");
    await db
      .update(householdInvitations)
      .set({ status: "revoked" })
      .where(and(eq(householdInvitations.token, token), eq(householdInvitations.householdId, householdId)));
  }

  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/transactions");
  return { success: true };
}

export async function updateMemberRole(memberId: string, role: "admin" | "contributor" | "viewer") {
  const { householdId } = await getAuthContext();
  await db.update(householdMembers).set({ role }).where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, householdId)));
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function updateMemberDisplayName(memberId: string, displayName: string) {
  const { householdId } = await getAuthContext();
  await db
    .update(householdMembers)
    .set({ displayName: displayName.trim() })
    .where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, householdId)));
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/transactions");
  return { success: true };
}
