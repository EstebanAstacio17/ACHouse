import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../../apps/web/.env.local") });

const conn = process.env.DATABASE_URL;
if (!conn) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const sql = neon(conn);

const indexStatements = [
  `CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON transactions(household_id, date DESC) WHERE deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_tenant_pending ON transactions(household_id) WHERE status = 'pending' AND deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id ON transactions(to_account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);`,
  `CREATE INDEX IF NOT EXISTS idx_household_members_clerk_tenant ON household_members(clerk_user_id, household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_household_id ON accounts(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_businesses_household_id ON businesses(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_loans_household_id ON loans(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);`,
  `CREATE INDEX IF NOT EXISTS idx_business_quotes_household_id ON business_quotes(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_business_catalog_household_id ON business_catalog_items(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_date ON audit_log(household_id, created_at DESC);`,
];

async function main() {
  console.log("Applying additive enterprise database indexes...");
  for (const stmt of indexStatements) {
    const idxName = stmt.match(/idx_[a-z_]+/)?.[0] || stmt;
    const t0 = Date.now();
    await sql(stmt);
    console.log(`✓ ${idxName} (${Date.now() - t0}ms)`);
  }
  console.log("All indexes created successfully!");
}

main().catch(err => {
  console.error("Index migration failed:", err);
  process.exit(1);
});
