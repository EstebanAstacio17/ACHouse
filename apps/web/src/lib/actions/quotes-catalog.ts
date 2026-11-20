"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@achouse/db";
import {
  businessCatalogItems,
  businessQuotes,
  businesses,
  accounts,
  transactions,
  householdMembers,
} from "@achouse/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveHouseholdId } from "@/lib/household";
import {
  businessCatalogItemSchema,
  businessQuoteSchema,
  type BusinessCatalogItem,
  type BusinessQuote,
} from "@achouse/types";
import { getTenantContext, requireWriter } from "@/lib/tenant";

async function getAuthContext(requireWrite = false) {
  const ctx = requireWrite ? await requireWriter() : await getTenantContext();
  return { userId: ctx.userId, householdId: ctx.householdId, currentMember: ctx.member, role: ctx.role };
}

// ── Catalog Management ────────────────────────────────────────────────────────

export async function getCatalogItems(businessId?: string): Promise<BusinessCatalogItem[]> {
  const { householdId } = await getAuthContext();

  const conditions = [
    eq(businessCatalogItems.householdId, householdId),
    eq(businessCatalogItems.isActive, true),
  ];

  if (businessId) {
    conditions.push(eq(businessCatalogItems.businessId, businessId));
  }

  const items = await db.query.businessCatalogItems.findMany({
    where: and(...conditions),
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return items as BusinessCatalogItem[];
}

export async function createCatalogItem(data: z.input<typeof businessCatalogItemSchema>) {
  const { householdId } = await getAuthContext();
  const parsed = businessCatalogItemSchema.parse(data);

  const [created] = await db
    .insert(businessCatalogItems)
    .values({
      id: createId(),
      householdId,
      businessId: parsed.businessId,
      name: parsed.name.trim(),
      itemType: parsed.itemType,
      unit: parsed.unit.trim(),
      unitCost: String(parsed.unitCost),
      defaultPrice: parsed.defaultPrice !== undefined ? String(parsed.defaultPrice) : null,
      currency: parsed.currency || "DOP",
      metadata: parsed.metadata || {},
      isActive: parsed.isActive ?? true,
    })
    .returning();

  revalidatePath("/businesses");
  return created;
}

export async function updateCatalogItem(
  id: string,
  data: Partial<z.input<typeof businessCatalogItemSchema>>
) {
  const { householdId } = await getAuthContext();

  const updateValues: Record<string, any> = { updatedAt: new Date() };
  if (data.name !== undefined) updateValues.name = data.name.trim();
  if (data.itemType !== undefined) updateValues.itemType = data.itemType;
  if (data.unit !== undefined) updateValues.unit = data.unit.trim();
  if (data.unitCost !== undefined) updateValues.unitCost = String(data.unitCost);
  if (data.defaultPrice !== undefined) updateValues.defaultPrice = data.defaultPrice !== null ? String(data.defaultPrice) : null;
  if (data.currency !== undefined) updateValues.currency = data.currency;
  if (data.metadata !== undefined) updateValues.metadata = data.metadata;
  if (data.isActive !== undefined) updateValues.isActive = data.isActive;

  const [updated] = await db
    .update(businessCatalogItems)
    .set(updateValues)
    .where(and(eq(businessCatalogItems.id, id), eq(businessCatalogItems.householdId, householdId)))
    .returning();

  revalidatePath("/businesses");
  return updated;
}

export async function deleteCatalogItem(id: string) {
  const { householdId } = await getAuthContext();

  await db
    .update(businessCatalogItems)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(businessCatalogItems.id, id), eq(businessCatalogItems.householdId, householdId)));

  revalidatePath("/businesses");
  return { success: true };
}

export async function seedDefaultCatalog(businessId: string, businessName?: string) {
  const { householdId } = await getAuthContext();

  let targetBiz = await db.query.businesses.findFirst({
    where: and(eq(businesses.id, businessId), eq(businesses.householdId, householdId)),
  });

  if (!targetBiz && businessName) {
    targetBiz = await db.query.businesses.findFirst({
      where: and(eq(businesses.name, businessName), eq(businesses.householdId, householdId)),
    });
  }

  if (!targetBiz) throw new Error("Negocio no encontrado");

  const nameUpper = targetBiz.name.toUpperCase();

  const seeds: Array<{
    name: string;
    itemType: "material" | "labor" | "energy" | "machine" | "service" | "addon";
    unit: string;
    unitCost: string;
    defaultPrice?: string;
    metadata?: Record<string, any>;
  }> = [];

  if (nameUpper.includes("AIMPRIMIR3D")) {
    seeds.push(
      {
        name: "Filamento PLA Estándar (1kg)",
        itemType: "material",
        unit: "rollo",
        unitCost: "1951.00",
        metadata: {
          filamentCost: 1220.0,
          courierCost: 681.0,
          shippingLocalCost: 50.0,
          spoolGrams: 1000,
          formula: "(1220 + 681 + 50) / 1000g = 1.951 RD$/g",
        },
      },
      {
        name: "Energía Eléctrica Impresión",
        itemType: "energy",
        unit: "kWh",
        unitCost: "9.00",
        metadata: {
          machineWatts: 200,
          kwhCost: 9.0,
          formula: "horas * (200W / 1000) * 9.00 RD$/kWh",
        },
      },
      {
        name: "Desgaste y Mantenimiento Impresora 3D",
        itemType: "machine",
        unit: "hora",
        unitCost: "16.50",
        metadata: {
          machineInvestment: 33000.0,
          estimatedLifespanHours: 2000,
          formula: "33,000 RD$ / 2,000h = 16.50 RD$/h",
        },
      },
      {
        name: "Mano de Obra (Laminación y Postproceso)",
        itemType: "labor",
        unit: "hora",
        unitCost: "325.00",
        metadata: {
          hourlyRate: 325.0,
          description: "Tiempo manual de preparación, retiro de soportes y acabados",
        },
      },
      {
        name: "Empaque y Llaverito (Adicionales)",
        itemType: "addon",
        unit: "unidad",
        unitCost: "90.00",
        metadata: {
          description: "Bolsa protectora, argolla y llavero complementario",
        },
      }
    );
  } else if (nameUpper.includes("COPIA")) {
    seeds.push(
      {
        name: "Copia B/N Carta",
        itemType: "service",
        unit: "copia",
        unitCost: "1.50",
        defaultPrice: "5.00",
      },
      {
        name: "Copia Color Carta",
        itemType: "service",
        unit: "copia",
        unitCost: "5.00",
        defaultPrice: "15.00",
      },
      {
        name: "Resma Papel Bond 20lb (500 hojas)",
        itemType: "material",
        unit: "resma",
        unitCost: "280.00",
      },
      {
        name: "Tóner Negro Rendimiento Alto",
        itemType: "material",
        unit: "unidad",
        unitCost: "1400.00",
      },
      {
        name: "Mano de Obra / Digitación",
        itemType: "labor",
        unit: "hora",
        unitCost: "200.00",
      }
    );
  } else if (nameUpper.includes("PORTAFORZA")) {
    seeds.push(
      {
        name: "Hora Desarrollo de Software / Web",
        itemType: "labor",
        unit: "hora",
        unitCost: "800.00",
        defaultPrice: "1500.00",
      },
      {
        name: "Infraestructura Cloud / Servidor",
        itemType: "service",
        unit: "mes",
        unitCost: "1200.00",
        defaultPrice: "2500.00",
      }
    );
  } else if (nameUpper.includes("ESENCIA")) {
    seeds.push(
      {
        name: "Montaje y Decoración de Evento",
        itemType: "service",
        unit: "evento",
        unitCost: "2500.00",
        defaultPrice: "6500.00",
      },
      {
        name: "Materiales y Flores de Ambientación",
        itemType: "material",
        unit: "paquete",
        unitCost: "1800.00",
      }
    );
  } else if (nameUpper.includes("AS TEJE")) {
    seeds.push(
      {
        name: "Servicio Técnico Especializado",
        itemType: "service",
        unit: "servicio",
        unitCost: "600.00",
        defaultPrice: "1500.00",
      },
      {
        name: "Insumos y Repuestos Técnicos",
        itemType: "material",
        unit: "unidad",
        unitCost: "400.00",
      }
    );
  } else {
    // Generic / Independiente
    seeds.push(
      {
        name: "Hora Consultoría / Servicios Independientes",
        itemType: "labor",
        unit: "hora",
        unitCost: "700.00",
        defaultPrice: "1500.00",
      },
      {
        name: "Gastos Operativos / Insumos",
        itemType: "material",
        unit: "unidad",
        unitCost: "300.00",
      }
    );
  }

  for (const item of seeds) {
    const existing = await db.query.businessCatalogItems.findFirst({
      where: and(
        eq(businessCatalogItems.businessId, targetBiz.id),
        eq(businessCatalogItems.name, item.name)
      ),
    });

    if (!existing) {
      await db.insert(businessCatalogItems).values({
        id: createId(),
        householdId,
        businessId: targetBiz.id,
        name: item.name,
        itemType: item.itemType,
        unit: item.unit,
        unitCost: item.unitCost,
        defaultPrice: item.defaultPrice || null,
        metadata: item.metadata || {},
        isActive: true,
      });
    }
  }

  revalidatePath("/businesses");
  return { success: true, count: seeds.length };
}

// ── Quotes Engine ─────────────────────────────────────────────────────────────

export async function getQuotes(businessId?: string): Promise<BusinessQuote[]> {
  const { householdId } = await getAuthContext();

  const conditions = [
    eq(businessQuotes.householdId, householdId),
    isNull(businessQuotes.deletedAt),
  ];

  if (businessId) {
    conditions.push(eq(businessQuotes.businessId, businessId));
  }

  const quotesList = await db.query.businessQuotes.findMany({
    where: and(...conditions),
    orderBy: (q, { desc }) => [desc(q.createdAt)],
  });

  return quotesList as BusinessQuote[];
}

export async function createQuote(data: z.input<typeof businessQuoteSchema>) {
  const { householdId, currentMember } = await getAuthContext();
  const parsed = businessQuoteSchema.parse(data);

  const total = Number(parsed.totalAmount || 0);
  const paid = Number(parsed.paidAmount || 0);
  const remaining = Math.max(0, total - paid);
  const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  let status = parsed.paymentStatus;
  if (paid >= total && total > 0) {
    status = "paid";
  } else if (paid > 0 && paid < total) {
    status = "partial";
  }

  const [quote] = await db
    .insert(businessQuotes)
    .values({
      id: createId(),
      householdId,
      businessId: parsed.businessId,
      memberId: parsed.memberId || currentMember.id,
      accountId: parsed.accountId || null,
      clientName: parsed.clientName.trim(),
      title: parsed.title.trim(),
      description: parsed.description?.trim() || null,
      templateType: parsed.templateType || "3d_print",
      deliveryTime: parsed.deliveryTime?.trim() || null,
      paymentMethod: parsed.paymentMethod?.trim() || null,
      currency: parsed.currency || "DOP",
      lineItems: parsed.lineItems || {},
      materialTotal: String(parsed.materialTotal || 0),
      energyTotal: String(parsed.energyTotal || 0),
      wearRiskTotal: String(parsed.wearRiskTotal || 0),
      laborTotal: String(parsed.laborTotal || 0),
      overheadTotal: String(parsed.overheadTotal || 0),
      profitTotal: String(parsed.profitTotal || 0),
      totalAmount: String(total),
      paymentStatus: status,
      paidPercentage: String(paidPct.toFixed(2)),
      paidAmount: String(paid),
      remainingAmount: String(remaining),
      date: parsed.date ? new Date(parsed.date) : new Date(),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
    })
    .returning();

  // If initial payment was made and an account was selected, record the transaction
  if (paid > 0 && parsed.accountId) {
    await recordQuotePayment(quote.id, {
      amount: paid,
      accountId: parsed.accountId,
      memberId: parsed.memberId || currentMember.id,
      notes: "Cobro inicial / abono de cotización",
    });
  }

  revalidatePath("/businesses");
  return quote;
}

export async function updateQuote(
  id: string,
  data: Partial<z.input<typeof businessQuoteSchema>>
) {
  const { householdId } = await getAuthContext();

  const updateValues: Record<string, any> = { updatedAt: new Date() };
  if (data.clientName !== undefined) updateValues.clientName = data.clientName.trim();
  if (data.title !== undefined) updateValues.title = data.title.trim();
  if (data.description !== undefined) updateValues.description = data.description?.trim() || null;
  if (data.deliveryTime !== undefined) updateValues.deliveryTime = data.deliveryTime?.trim() || null;
  if (data.paymentMethod !== undefined) updateValues.paymentMethod = data.paymentMethod?.trim() || null;
  if (data.lineItems !== undefined) updateValues.lineItems = data.lineItems;
  if (data.materialTotal !== undefined) updateValues.materialTotal = String(data.materialTotal);
  if (data.energyTotal !== undefined) updateValues.energyTotal = String(data.energyTotal);
  if (data.wearRiskTotal !== undefined) updateValues.wearRiskTotal = String(data.wearRiskTotal);
  if (data.laborTotal !== undefined) updateValues.laborTotal = String(data.laborTotal);
  if (data.overheadTotal !== undefined) updateValues.overheadTotal = String(data.overheadTotal);
  if (data.profitTotal !== undefined) updateValues.profitTotal = String(data.profitTotal);
  if (data.totalAmount !== undefined) updateValues.totalAmount = String(data.totalAmount);
  if (data.paymentStatus !== undefined) updateValues.paymentStatus = data.paymentStatus;

  const [updated] = await db
    .update(businessQuotes)
    .set(updateValues)
    .where(and(eq(businessQuotes.id, id), eq(businessQuotes.householdId, householdId)))
    .returning();

  revalidatePath("/businesses");
  return updated;
}

export async function deleteQuote(id: string) {
  const { householdId } = await getAuthContext();

  await db
    .update(businessQuotes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(businessQuotes.id, id), eq(businessQuotes.householdId, householdId)));

  revalidatePath("/businesses");
  return { success: true };
}

// ── Payment & Concept Pocket Split ────────────────────────────────────────────

export async function recordQuotePayment(
  quoteId: string,
  payload: {
    amount: number;
    accountId: string;
    memberId?: string;
    notes?: string;
  }
) {
  const { householdId, currentMember, userId } = await getAuthContext();

  const quote = await db.query.businessQuotes.findFirst({
    where: and(eq(businessQuotes.id, quoteId), eq(businessQuotes.householdId, householdId)),
  });

  if (!quote) throw new Error("Cotización no encontrada");

  const total = Number(quote.totalAmount || 0);
  const currentPaid = Number(quote.paidAmount || 0);
  const payAmount = Number(payload.amount);

  if (payAmount <= 0) throw new Error("El monto del pago debe ser mayor a cero");

  const newPaidAmount = currentPaid + payAmount;
  const newRemainingAmount = Math.max(0, total - newPaidAmount);
  const newPaidPct = total > 0 ? Math.min(100, (newPaidAmount / total) * 100) : 100;
  const newStatus = newRemainingAmount <= 0.01 ? "paid" : "partial";

  // Calculate proportional breakdown into pockets for this payment tranche
  const ratio = total > 0 ? payAmount / total : 1;
  const pocketBreakdown = {
    material: Number((Number(quote.materialTotal || 0) * ratio).toFixed(2)),
    energy: Number((Number(quote.energyTotal || 0) * ratio).toFixed(2)),
    wearRisk: Number((Number(quote.wearRiskTotal || 0) * ratio).toFixed(2)),
    labor: Number((Number(quote.laborTotal || 0) * ratio).toFixed(2)),
    overhead: Number((Number(quote.overheadTotal || 0) * ratio).toFixed(2)),
    profit: Number((Number(quote.profitTotal || 0) * ratio).toFixed(2)),
  };

  // 1. Create income transaction in transactions
  const txId = createId();
  await db.insert(transactions).values({
    id: txId,
    householdId,
    accountId: payload.accountId,
    businessId: quote.businessId,
    memberId: payload.memberId || quote.memberId || currentMember.id,
    type: "income",
    amount: String(payAmount.toFixed(2)),
    currency: quote.currency || "DOP",
    description: `Cobro cotización: "${quote.title}" — Cliente: ${quote.clientName}${payload.notes ? ` (${payload.notes})` : ""}`,
    date: new Date(),
    status: "cleared",
    conceptType: "income_sale",
    costBreakdown: pocketBreakdown,
    quoteId: quote.id,
    createdBy: userId,
  });

  // 2. Adjust account balance
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, payload.accountId), eq(accounts.householdId, householdId)),
  });

  if (account) {
    const currentBal = Number(account.balance || 0);
    const newBal = (currentBal + payAmount).toFixed(2);
    await db
      .update(accounts)
      .set({ balance: newBal, updatedAt: new Date() })
      .where(eq(accounts.id, account.id));
  }

  // 3. Update quote record
  await db
    .update(businessQuotes)
    .set({
      paidAmount: String(newPaidAmount.toFixed(2)),
      remainingAmount: String(newRemainingAmount.toFixed(2)),
      paidPercentage: String(newPaidPct.toFixed(2)),
      paymentStatus: newStatus,
      accountId: payload.accountId,
      updatedAt: new Date(),
    })
    .where(eq(businessQuotes.id, quote.id));

  revalidatePath("/businesses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return {
    success: true,
    newStatus,
    paidAmount: newPaidAmount,
    remainingAmount: newRemainingAmount,
    pocketBreakdown,
  };
}
