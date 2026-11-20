import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Load environment variables from apps/web/.env.local, .env.local or .env in the monorepo root
const rootPath = process.cwd();
dotenv.config({ path: path.join(rootPath, "apps/web/.env.local") });
dotenv.config({ path: path.join(rootPath, ".env.local") });
dotenv.config({ path: path.join(rootPath, ".env") });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema/index.ts";

async function runBackup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("placeholder") || connectionString.includes("REEMPLAZAR")) {
    console.error("❌ ERROR: DATABASE_URL no está definida o es inválida.");
    process.exit(1);
  }

  console.log("🔌 Conectando a la base de datos para snapshot de seguridad...");
  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  try {
    console.log("📦 Extrayendo tablas existentes...");

    const [
      householdsData,
      membersData,
      invitationsData,
      incomeSourcesData,
      accountsData,
      categoriesData,
      transactionsData,
      businessesData,
      businessTxData,
      projectsData,
      projectTxData,
      loansData,
      loanPaymentsData,
      reconciliationData,
      auditLogData,
      catalogItemsData,
      quotesData,
    ] = await Promise.all([
      db.select().from(schema.households),
      db.select().from(schema.householdMembers),
      db.select().from(schema.householdInvitations),
      db.select().from(schema.memberIncomeSources),
      db.select().from(schema.accounts),
      db.select().from(schema.categories),
      db.select().from(schema.transactions),
      db.select().from(schema.businesses),
      db.select().from(schema.businessTransactions),
      db.select().from(schema.projects),
      db.select().from(schema.projectTransactions),
      db.select().from(schema.loans),
      db.select().from(schema.loanPayments),
      db.select().from(schema.reconciliationEntries),
      db.select().from(schema.auditLog),
      db.select().from(schema.businessCatalogItems),
      db.select().from(schema.businessQuotes),
    ]);

    const backupData = {
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        summary: {
          households: householdsData.length,
          members: membersData.length,
          accounts: accountsData.length,
          categories: categoriesData.length,
          transactions: transactionsData.length,
          businesses: businessesData.length,
          businessTransactions: businessTxData.length,
          projects: projectsData.length,
          projectTransactions: projectTxData.length,
          loans: loansData.length,
          loanPayments: loanPaymentsData.length,
          reconciliationEntries: reconciliationData.length,
          catalogItems: catalogItemsData.length,
          quotes: quotesData.length,
        },
      },
      data: {
        households: householdsData,
        householdMembers: membersData,
        householdInvitations: invitationsData,
        memberIncomeSources: incomeSourcesData,
        accounts: accountsData,
        categories: categoriesData,
        transactions: transactionsData,
        businesses: businessesData,
        businessTransactions: businessTxData,
        projects: projectsData,
        projectTransactions: projectTxData,
        loans: loansData,
        loanPayments: loanPaymentsData,
        reconciliationEntries: reconciliationData,
        auditLog: auditLogData,
        catalogItems: catalogItemsData,
        quotes: quotesData,
      },
    };

    const backupsDir = path.join(rootPath, "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(backupsDir, `backup-${timestampStr}.json`);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf8");

    console.log(`✅ RESPALDO COMPLETADO EXITOSAMENTE`);
    console.log(`📁 Archivo: ${filePath}`);
    console.log(`📊 Resumen de registros guardados:`);
    console.table(backupData.meta.summary);
  } catch (error) {
    console.error("❌ Error al realizar el respaldo:", error);
    process.exit(1);
  }
}

runBackup();
