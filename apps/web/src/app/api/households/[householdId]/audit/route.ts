import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { auditLog } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const logs = await db.query.auditLog.findMany({
      where: eq(auditLog.householdId, householdId),
      orderBy: [desc(auditLog.createdAt)],
      limit: 50,
      with: {
        member: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[GET audit]", error);
    return NextResponse.json({ error: "Error al cargar registros de auditoría" }, { status: 500 });
  }
}
