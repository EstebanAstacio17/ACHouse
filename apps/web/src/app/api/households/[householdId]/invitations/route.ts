import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { householdInvitations } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  role: z.enum(["admin", "contributor", "viewer"]).default("contributor"),
});

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
    const list = await db.query.householdInvitations.findMany({
      where: eq(householdInvitations.householdId, householdId),
      orderBy: (inv, { desc }) => [desc(inv.createdAt)],
    });

    return NextResponse.json({ invitations: list });
  } catch (error) {
    console.error("[GET invitations]", error);
    return NextResponse.json({ error: "Error al obtener invitaciones" }, { status: 500 });
  }
}

export async function POST(
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
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, role } = parsed.data;
    const token = createId() + createId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await db
      .insert(householdInvitations)
      .values({
        householdId,
        email,
        role,
        token,
        invitedBy: authRes.userId,
        status: "pending",
        expiresAt,
      })
      .returning();

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const origin = host && !host.includes("localhost")
      ? `${proto}://${host}`
      : (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin);
    const inviteUrl = `${origin}/invite/${token}`;

    return NextResponse.json({ invitation, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error("[POST invitations]", error);
    return NextResponse.json({ error: "Error al crear invitación" }, { status: 500 });
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
  const invitationId = searchParams.get("id");

  if (!invitationId) {
    return NextResponse.json({ error: "ID de invitación requerido" }, { status: 400 });
  }

  try {
    await db
      .update(householdInvitations)
      .set({ status: "revoked" })
      .where(
        and(
          eq(householdInvitations.id, invitationId),
          eq(householdInvitations.householdId, householdId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE invitations]", error);
    return NextResponse.json({ error: "Error al revocar invitación" }, { status: 500 });
  }
}
