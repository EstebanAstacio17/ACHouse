import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHouseholdNotifications } from "@/lib/actions/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { householdId } = await params;
    const result = await getHouseholdNotifications(householdId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/households/[householdId]/notifications:", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones", details: error.message },
      { status: 500 }
    );
  }
}
