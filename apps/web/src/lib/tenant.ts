import "server-only";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@achouse/db";
import { householdMembers } from "@achouse/db/schema";
import { and, eq } from "drizzle-orm";
import type { MemberRole } from "@achouse/types";

export type TenantContext = {
  userId: string;
  householdId: string;
  member: typeof householdMembers.$inferSelect;
  role: MemberRole;
};

export class TenantError extends Error {
  code: "UNAUTHENTICATED" | "NO_HOUSEHOLD" | "FORBIDDEN";
  status: number;

  constructor(code: "UNAUTHENTICATED" | "NO_HOUSEHOLD" | "FORBIDDEN", message?: string) {
    const defaultMessages = {
      UNAUTHENTICATED: "No autenticado",
      NO_HOUSEHOLD: "No tienes un hogar activo seleccionado o membresía activa",
      FORBIDDEN: "No tienes permisos suficientes para realizar esta acción",
    };
    super(message || defaultMessages[code]);
    this.name = "TenantError";
    this.code = code;
    this.status = code === "UNAUTHENTICATED" ? 401 : 403;
  }
}

/**
 * Resuelve y memoiza por petición HTTP el contexto del hogar actual y la membresía del usuario.
 * React.cache evita llamadas duplicadas a la BD dentro del mismo ciclo de vida de la petición.
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const { userId } = await auth();
  if (!userId) {
    throw new TenantError("UNAUTHENTICATED");
  }

  const cookieStore = await cookies();
  const cookieHid = cookieStore.get("household_id")?.value;

  // Obtenemos las membresías activas del usuario
  const memberships = await db.query.householdMembers.findMany({
    where: and(
      eq(householdMembers.clerkUserId, userId),
      eq(householdMembers.isActive, true)
    ),
  });

  if (!memberships || memberships.length === 0) {
    throw new TenantError("NO_HOUSEHOLD");
  }

  // Si la cookie corresponde a un hogar válido del usuario, usamos ese; si no, la primera membresía activa
  const targetMember = (cookieHid && memberships.find((m) => m.householdId === cookieHid)) || memberships[0];

  return {
    userId,
    householdId: targetMember.householdId,
    member: targetMember,
    role: targetMember.role as MemberRole,
  };
});

/**
 * Asegura que el usuario tenga permisos de escritura (admin o contributor).
 * Bloquea centralizadamente a usuarios con rol viewer.
 */
export async function requireWriter(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx.role === "viewer") {
    throw new TenantError("FORBIDDEN", "Los usuarios con rol de solo lectura no pueden realizar modificaciones.");
  }
  return ctx;
}

/**
 * Asegura que el usuario sea administrador del hogar.
 */
export async function requireAdmin(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx.role !== "admin") {
    throw new TenantError("FORBIDDEN", "Solo los administradores del hogar pueden realizar esta acción.");
  }
  return ctx;
}
