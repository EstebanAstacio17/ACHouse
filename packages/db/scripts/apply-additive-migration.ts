import path from "node:path";
import dotenv from "dotenv";

const rootPath = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(rootPath, "apps/web/.env.local") });
dotenv.config({ path: path.join(rootPath, ".env.local") });
dotenv.config({ path: path.join(rootPath, ".env") });

import { neon } from "@neondatabase/serverless";

async function applyMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL no encontrada.");
    process.exit(1);
  }

  const sql = neon(connectionString);
  console.log("🚀 Aplicando migración 100% aditiva a PostgreSQL...");

  try {
    // 1. Create business_catalog_items table
    await sql`
      CREATE TABLE IF NOT EXISTS business_catalog_items (
        id text PRIMARY KEY NOT NULL,
        household_id text NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name text NOT NULL,
        item_type text NOT NULL,
        unit text NOT NULL,
        unit_cost numeric(15, 2) DEFAULT '0' NOT NULL,
        default_price numeric(15, 2),
        currency text DEFAULT 'DOP' NOT NULL,
        metadata jsonb,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `;
    console.log("  ✅ Tabla business_catalog_items verificada / creada.");

    // 2. Create business_quotes table
    await sql`
      CREATE TABLE IF NOT EXISTS business_quotes (
        id text PRIMARY KEY NOT NULL,
        household_id text NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        member_id text REFERENCES household_members(id),
        account_id text REFERENCES accounts(id),
        client_name text NOT NULL,
        title text NOT NULL,
        description text,
        template_type text DEFAULT '3d_print' NOT NULL,
        delivery_time text,
        payment_method text,
        currency text DEFAULT 'DOP' NOT NULL,
        line_items jsonb,
        material_total numeric(15, 2) DEFAULT '0' NOT NULL,
        energy_total numeric(15, 2) DEFAULT '0' NOT NULL,
        wear_risk_total numeric(15, 2) DEFAULT '0' NOT NULL,
        labor_total numeric(15, 2) DEFAULT '0' NOT NULL,
        overhead_total numeric(15, 2) DEFAULT '0' NOT NULL,
        profit_total numeric(15, 2) DEFAULT '0' NOT NULL,
        total_amount numeric(15, 2) DEFAULT '0' NOT NULL,
        payment_status text DEFAULT 'quote' NOT NULL,
        paid_percentage numeric(5, 2) DEFAULT '0' NOT NULL,
        paid_amount numeric(15, 2) DEFAULT '0' NOT NULL,
        remaining_amount numeric(15, 2) DEFAULT '0' NOT NULL,
        date timestamp with time zone DEFAULT now() NOT NULL,
        due_date timestamp with time zone,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone
      );
    `;
    console.log("  ✅ Tabla business_quotes verificada / creada.");

    // 3. Add columns to accounts
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_member_id text;`;
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS business_id text;`;
    console.log("  ✅ Columnas owner_member_id y business_id agregadas a accounts.");

    // 4. Add columns to transactions
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS concept_type text;`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cost_breakdown jsonb;`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS quote_id text;`;
    console.log("  ✅ Columnas concept_type, cost_breakdown y quote_id agregadas a transactions.");

    // 5. Add foreign key constraints safely if not present
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'accounts_owner_member_id_fk'
        ) THEN
          ALTER TABLE accounts ADD CONSTRAINT accounts_owner_member_id_fk
          FOREIGN KEY (owner_member_id) REFERENCES household_members(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'accounts_business_id_fk'
        ) THEN
          ALTER TABLE accounts ADD CONSTRAINT accounts_business_id_fk
          FOREIGN KEY (business_id) REFERENCES businesses(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'transactions_quote_id_fk'
        ) THEN
          ALTER TABLE transactions ADD CONSTRAINT transactions_quote_id_fk
          FOREIGN KEY (quote_id) REFERENCES business_quotes(id);
        END IF;
      END $$;
    `;
    console.log("  ✅ Constraints de claves foráneas verificados.");

    console.log("✨ MIGRACIÓN ADITIVA COMPLETADA CON ÉXITO.");
  } catch (error) {
    console.error("❌ Error en la migración:", error);
    process.exit(1);
  }
}

applyMigration();
