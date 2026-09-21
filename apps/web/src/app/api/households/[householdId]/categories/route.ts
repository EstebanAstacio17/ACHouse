import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { categories } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_CATEGORIES = [
  // Egresos
  { name: "Alimentación", type: "expense", color: "#6366f1", icon: "🛒", subcategories: ["Supermercado", "Restaurantes", "Cafetería"] },
  { name: "Vivienda", type: "expense", color: "#8b5cf6", icon: "🏠", subcategories: ["Renta/Hipoteca", "Servicios (Luz, Agua, Gas)", "Mantenimiento", "Internet/Telefonía"] },
  { name: "Transporte", type: "expense", color: "#f97316", icon: "🚗", subcategories: ["Gasolina", "Transporte Público", "Mantenimiento Vehicular", "Seguro"] },
  { name: "Salud y Bienestar", type: "expense", color: "#06b6d4", icon: "❤️", subcategories: ["Médico", "Farmacia", "Gimnasio", "Seguro Médico"] },
  { name: "Educación", type: "expense", color: "#3b82f6", icon: "📚", subcategories: ["Colegiatura", "Cursos", "Libros y Materiales"] },
  { name: "Entretenimiento", type: "expense", color: "#ec4899", icon: "🎬", subcategories: ["Streaming", "Salidas", "Viajes"] },
  { name: "Compras Personales", type: "expense", color: "#e11d48", icon: "🛍️", subcategories: ["Ropa", "Tecnología", "Cuidado Personal"] },
  { name: "Servicios Financieros", type: "expense", color: "#64748b", icon: "💳", subcategories: ["Comisiones Bancarias", "Intereses", "Impuestos"] },
  // Ingresos
  { name: "Salario Principal", type: "income", color: "#22c55e", icon: "💼", subcategories: ["Nómina", "Bono", "Horas Extras"] },
  { name: "Negocios y Emprendimiento", type: "income", color: "#14b8a6", icon: "🏢", subcategories: ["Ventas", "Servicios Profesionales"] },
  { name: "Inversiones", type: "income", color: "#84cc16", icon: "📈", subcategories: ["Dividendos", "Rendimientos", "Alquileres"] },
  { name: "Otros Ingresos", type: "income", color: "#10b981", icon: "🎁", subcategories: ["Regalos", "Premios", "Reembolsos"] },
];

const categorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(60),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#6366f1"),
  icon: z.string().default("tag"),
  parentId: z.string().nullable().optional(),
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
    let allCategories = await db.query.categories.findMany({
      where: and(
        eq(categories.householdId, householdId),
        eq(categories.isActive, true),
        isNull(categories.deletedAt)
      ),
      orderBy: (c, { asc }) => [asc(c.name)],
    });

    // Auto-seed default categories if none exist
    if (allCategories.length === 0) {
      for (const def of DEFAULT_CATEGORIES) {
        const [parent] = await db
          .insert(categories)
          .values({
            householdId,
            name: def.name,
            type: def.type as "income" | "expense",
            color: def.color,
            icon: def.icon,
            parentId: null,
          })
          .returning();

        if (parent && def.subcategories.length > 0) {
          for (const sub of def.subcategories) {
            await db.insert(categories).values({
              householdId,
              name: sub,
              type: def.type as "income" | "expense",
              color: def.color,
              icon: def.icon,
              parentId: parent.id,
            });
          }
        }
      }

      allCategories = await db.query.categories.findMany({
        where: and(
          eq(categories.householdId, householdId),
          eq(categories.isActive, true),
          isNull(categories.deletedAt)
        ),
        orderBy: (c, { asc }) => [asc(c.name)],
      });
    }

    // Build hierarchy tree
    const parents = allCategories.filter((c) => !c.parentId);
    const tree = parents.map((parent) => ({
      ...parent,
      children: allCategories.filter((c) => c.parentId === parent.id),
    }));

    return NextResponse.json({ categories: tree, rawCategories: allCategories });
  } catch (error) {
    console.error("[GET categories]", error);
    return NextResponse.json({ error: "Error al cargar categorías" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, type, color, icon, parentId } = parsed.data;

    const [category] = await db
      .insert(categories)
      .values({
        householdId,
        name,
        type,
        color,
        icon,
        parentId: parentId || null,
      })
      .returning();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("[POST category]", error);
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  try {
    const body = await req.json();
    const { id, name, type, color, icon, parentId } = body;
    if (!id) {
      return NextResponse.json({ error: "ID de categoría requerido" }, { status: 400 });
    }

    const [updated] = await db
      .update(categories)
      .set({
        name,
        type,
        color,
        icon,
        parentId: parentId || null,
      })
      .where(and(eq(categories.id, id), eq(categories.householdId, householdId)))
      .returning();

    if (type && updated && !updated.parentId) {
      await db
        .update(categories)
        .set({ type })
        .where(and(eq(categories.parentId, id), eq(categories.householdId, householdId)));
    }

    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("[PUT category]", error);
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 });
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
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  try {
    // Soft delete category and child subcategories
    await db
      .update(categories)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(categories.id, id), eq(categories.householdId, householdId)));

    await db
      .update(categories)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(categories.parentId, id), eq(categories.householdId, householdId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE category]", error);
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 });
  }
}
