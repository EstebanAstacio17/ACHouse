import path from "node:path";
import dotenv from "dotenv";

const rootPath = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(rootPath, "apps/web/.env.local") });
dotenv.config({ path: path.join(rootPath, ".env.local") });
dotenv.config({ path: path.join(rootPath, ".env") });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

async function runSeed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log("🌱 Inicializando catálogo de insumos y parámetros para los negocios...");

  const allBizs = await db.select().from(schema.businesses);
  console.log(`Found ${allBizs.length} businesses.`);

  for (const b of allBizs) {
    if (!b.isActive) continue;
    const nameUpper = b.name.toUpperCase();
    console.log(`Checking catalog for: ${b.name} (${b.id})`);

    const items: Array<{
      name: string;
      itemType: string;
      unit: string;
      unitCost: string;
      defaultPrice?: string;
      metadata?: any;
    }> = [];

    if (nameUpper.includes("AIMPRIMIR3D")) {
      items.push(
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
            description: "Tiempo manual de preparación, laminación y postprocesado",
          },
        },
        {
          name: "Empaque y Llaverito (Adicionales)",
          itemType: "addon",
          unit: "unidad",
          unitCost: "90.00",
          metadata: {
            description: "Bolsa protectora, argolla y llavero de cortesía u otros",
          },
        }
      );
    } else if (nameUpper.includes("COPIA")) {
      items.push(
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
        }
      );
    } else if (nameUpper.includes("PORTAFORZA")) {
      items.push(
        {
          name: "Hora Desarrollo Software / Web",
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
      items.push(
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
      items.push(
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
    }

    for (const it of items) {
      const existing = await db
        .select()
        .from(schema.businessCatalogItems)
        .where(
          and(
            eq(schema.businessCatalogItems.businessId, b.id),
            eq(schema.businessCatalogItems.name, it.name)
          )
        );

      if (existing.length === 0) {
        await db.insert(schema.businessCatalogItems).values({
          id: createId(),
          householdId: b.householdId,
          businessId: b.id,
          name: it.name,
          itemType: it.itemType,
          unit: it.unit,
          unitCost: it.unitCost,
          defaultPrice: it.defaultPrice || null,
          metadata: it.metadata || {},
          isActive: true,
        });
        console.log(`   + Creado ítem: ${it.name}`);
      }
    }
  }

  // Also check if COPIAS exists, if not create it
  const copiasBiz = allBizs.find((b) => b.name.toUpperCase().includes("COPIA"));
  if (!copiasBiz && allBizs.length > 0) {
    const householdId = allBizs[0].householdId;
    console.log("Creando negocio COPIAS...");
    const copiasId = createId();
    await db.insert(schema.businesses).values({
      id: copiasId,
      householdId,
      name: "COPIAS",
      description: "Centro de copias, impresiones y papelería",
      type: "Comercio",
      currency: "DOP",
      isActive: true,
    });
    console.log("Negocio COPIAS creado con ID:", copiasId);
  }

  console.log("✨ Catálogo inicializado con éxito.");
}

runSeed();
