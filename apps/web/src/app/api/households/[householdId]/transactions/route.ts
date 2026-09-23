import { NextResponse } from "next/server";
import { db } from "@achouse/db";
import { transactions, accounts, categories, householdMembers } from "@achouse/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { eq, and, isNull, gte, lte, ilike, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

const transactionSchema = z.object({
  accountId: z.string().min(1, "La cuenta es obligatoria"),
  toAccountId: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  businessId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.string().min(1, "El monto es obligatorio"),
  currency: z.string().default("DOP"),
  description: z.string().min(1, "La descripción es obligatoria"),
  date: z.string(), // ISO string
  referenceNo: z.string().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurringConfig: z.any().optional(),
  status: z.enum(["pending", "cleared", "reconciled"]).default("cleared"),
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

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");
  const accountId = searchParams.get("accountId");
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("perPage") || "50", 10);

  try {
    const conditions = [
      eq(transactions.householdId, householdId),
      isNull(transactions.deletedAt),
    ];

    if (type && ["income", "expense", "transfer"].includes(type)) {
      conditions.push(eq(transactions.type, type as "income" | "expense" | "transfer"));
    }
    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }
    if (memberId) {
      conditions.push(eq(transactions.memberId, memberId));
    }
    if (status) {
      conditions.push(eq(transactions.status, status as "pending" | "cleared" | "reconciled"));
    }
    if (startDate) {
      conditions.push(gte(transactions.date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(transactions.date, new Date(endDate)));
    }
    if (search) {
      conditions.push(ilike(transactions.description, `%${search}%`));
    }

    const whereClause = and(...conditions);

    const list = await db.query.transactions.findMany({
      where: whereClause,
      orderBy: [desc(transactions.date), desc(transactions.createdAt)],
      limit: perPage,
      offset: (page - 1) * perPage,
      with: {
        account: true,
        category: true,
        member: true,
      },
    });

    return NextResponse.json({
      transactions: list,
      page,
      perPage,
    });
  } catch (error) {
    console.error("[GET transactions]", error);
    return NextResponse.json({ error: "Error al cargar transacciones" }, { status: 500 });
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
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const numAmount = parseFloat(d.amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "El monto debe ser un número positivo" }, { status: 400 });
    }

    // Insert transaction
    const [transaction] = await db
      .insert(transactions)
      .values({
        id: createId(),
        householdId,
        accountId: d.accountId,
        toAccountId: d.type === "transfer" ? d.toAccountId : null,
        memberId: d.memberId || null,
        categoryId: d.categoryId || null,
        businessId: d.businessId || null,
        projectId: d.projectId || null,
        type: d.type,
        amount: d.amount,
        currency: d.currency,
        description: d.description,
        date: new Date(d.date),
        referenceNo: d.referenceNo || null,
        attachmentUrl: d.attachmentUrl || null,
        isRecurring: d.isRecurring,
        recurringConfig: d.recurringConfig || null,
        status: d.status,
        createdBy: authRes.userId,
      })
      .returning();

    // Update account balances only if transaction is not pending
    if (d.status !== "pending") {
      if (d.type === "expense") {
        await db
          .update(accounts)
          .set({
            balance: sql`${accounts.balance} - ${numAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, d.accountId));
      } else if (d.type === "income") {
        await db
          .update(accounts)
          .set({
            balance: sql`${accounts.balance} + ${numAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, d.accountId));
      } else if (d.type === "transfer" && d.toAccountId) {
        // Source account
        await db
          .update(accounts)
          .set({
            balance: sql`${accounts.balance} - ${numAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, d.accountId));

        // Destination account
        await db
          .update(accounts)
          .set({
            balance: sql`${accounts.balance} + ${numAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, d.toAccountId));
      }
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("[POST transaction]", error);
    return NextResponse.json({ error: "Error al registrar transacción" }, { status: 500 });
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
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de transacción requerido" }, { status: 400 });
    }

    const existing = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
    });
    if (!existing) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    const oldStatus = existing.status;
    const newStatus = data.status || oldStatus;
    const oldAmount = parseFloat(existing.amount || "0");
    const newAmount = data.amount !== undefined ? parseFloat(data.amount.toString()) : oldAmount;
    const targetAccountId = data.accountId || existing.accountId;

    if (oldStatus === "pending" && (newStatus === "cleared" || newStatus === "reconciled")) {
      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.id, targetAccountId), eq(accounts.householdId, householdId)),
      });
      if (account) {
        const cur = parseFloat(account.balance || "0");
        const diff = existing.type === "income" ? newAmount : existing.type === "expense" ? -newAmount : 0;
        await db.update(accounts).set({ balance: (cur + diff).toFixed(2), updatedAt: new Date() }).where(eq(accounts.id, account.id));
      }
    } else if ((oldStatus === "cleared" || oldStatus === "reconciled") && newStatus === "pending") {
      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.id, existing.accountId), eq(accounts.householdId, householdId)),
      });
      if (account) {
        const cur = parseFloat(account.balance || "0");
        const diff = existing.type === "income" ? -oldAmount : existing.type === "expense" ? oldAmount : 0;
        await db.update(accounts).set({ balance: (cur + diff).toFixed(2), updatedAt: new Date() }).where(eq(accounts.id, account.id));
      }
    }

    const [updated] = await db
      .update(transactions)
      .set({
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
      .returning();

    return NextResponse.json({ transaction: updated });
  } catch (error) {
    console.error("[PUT transaction]", error);
    return NextResponse.json({ error: "Error al actualizar transacción" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const authRes = await requireRole(householdId, ["admin", "contributor"]);
  if ("error" in authRes) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID de transacción requerido" }, { status: 400 });
  }

  try {
    // Find transaction to reverse balance
    const existing = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
    });

    if (existing && (existing.status === "cleared" || existing.status === "reconciled")) {
      const numAmount = parseFloat(existing.amount);
      if (existing.type === "expense") {
        await db
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${numAmount}` })
          .where(eq(accounts.id, existing.accountId));
      } else if (existing.type === "income") {
        await db
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${numAmount}` })
          .where(eq(accounts.id, existing.accountId));
      } else if (existing.type === "transfer" && existing.toAccountId) {
        await db
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${numAmount}` })
          .where(eq(accounts.id, existing.accountId));

        await db
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${numAmount}` })
          .where(eq(accounts.id, existing.toAccountId));
      }

      await db
        .update(transactions)
        .set({ deletedAt: new Date() })
        .where(eq(transactions.id, id));
    } else if (existing) {
      await db
        .update(transactions)
        .set({ deletedAt: new Date() })
        .where(eq(transactions.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE transaction]", error);
    return NextResponse.json({ error: "Error al eliminar transacción" }, { status: 500 });
  }
}
