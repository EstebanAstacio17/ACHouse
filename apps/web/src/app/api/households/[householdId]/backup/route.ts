import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import {
  households,
  householdMembers,
  householdInvitations,
  accounts,
  categories,
  transactions,
  businesses,
  businessTransactions,
  projects,
  projectTransactions,
  loans,
  loanPayments,
  reconciliationEntries,
} from "@achouse/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { householdId } = await params;

    // Verify member belongs to household
    const [membership] = await db
      .select()
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.clerkUserId, userId),
          eq(householdMembers.isActive, true)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "No tienes permiso para acceder a este hogar" },
        { status: 403 }
      );
    }

    // Extract all data scoped to this household
    const [
      householdData,
      membersData,
      invitationsData,
      accountsData,
      categoriesData,
      transactionsData,
      businessesData,
      projectsData,
      loansData,
      reconciliationData,
    ] = await Promise.all([
      db.select().from(households).where(eq(households.id, householdId)),
      db.select().from(householdMembers).where(eq(householdMembers.householdId, householdId)),
      db.select().from(householdInvitations).where(eq(householdInvitations.householdId, householdId)),
      db.select().from(accounts).where(eq(accounts.householdId, householdId)),
      db.select().from(categories).where(eq(categories.householdId, householdId)),
      db.select().from(transactions).where(eq(transactions.householdId, householdId)),
      db.select().from(businesses).where(eq(businesses.householdId, householdId)),
      db.select().from(projects).where(eq(projects.householdId, householdId)),
      db.select().from(loans).where(eq(loans.householdId, householdId)),
      db.select().from(reconciliationEntries).where(eq(reconciliationEntries.householdId, householdId)),
    ]);

    const backupPayload = {
      meta: {
        exportDate: new Date().toISOString(),
        householdId,
        householdName: householdData[0]?.name ?? "Hogar",
        version: "2.0",
        summary: {
          members: membersData.length,
          accounts: accountsData.length,
          categories: categoriesData.length,
          transactions: transactionsData.length,
          businesses: businessesData.length,
          projects: projectsData.length,
          loans: loansData.length,
          reconciliations: reconciliationData.length,
        },
      },
      data: {
        household: householdData[0] || null,
        householdMembers: membersData,
        householdInvitations: invitationsData,
        accounts: accountsData,
        categories: categoriesData,
        transactions: transactionsData,
        businesses: businessesData,
        projects: projectsData,
        loans: loansData,
        reconciliationEntries: reconciliationData,
      },
    };

    const fileName = `achouse-backup-${householdId}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating backup:", error);
    return NextResponse.json(
      { error: "Error al generar el respaldo de la base de datos" },
      { status: 500 }
    );
  }
}
