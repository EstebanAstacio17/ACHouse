import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { getHouseholdNotifications } from "@/lib/actions/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const { householdId } = await params;
    const authRes = await requireRole(householdId, ["admin", "contributor", "viewer"]);
    if ("error" in authRes) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const result = await getHouseholdNotifications(householdId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/households/[householdId]/notifications:", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}
