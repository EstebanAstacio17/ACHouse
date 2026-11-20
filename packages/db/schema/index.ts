import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const memberRoleEnum = pgEnum("member_role", ["admin", "contributor", "viewer"]);
export const accountTypeEnum = pgEnum("account_type", ["checking", "savings", "credit", "cash"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "cleared", "reconciled"]);
export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);
export const lenderTypeEnum = pgEnum("lender_type", ["bank", "person", "internal_member"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "paused", "completed", "cancelled"]);
export const incomeSrcTypeEnum = pgEnum("income_src_type", ["job", "business", "project"]);
export const interestTypeEnum = pgEnum("interest_type", ["fixed", "variable", "none"]);

// ─── Households & Members ─────────────────────────────────────────────────────

export const households = pgTable("households", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  defaultCurrency: text("default_currency").notNull().default("DOP"),
  timezone: text("timezone").notNull().default("UTC"),
  country: text("country"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  role: memberRoleEnum("role").notNull().default("contributor"),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const householdInvitations = pgTable("household_invitations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRoleEnum("role").notNull().default("contributor"),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberIncomeSources = pgTable("member_income_sources", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  memberId: text("member_id").notNull().references(() => householdMembers.id, { onDelete: "cascade" }),
  type: incomeSrcTypeEnum("type").notNull(),
  name: text("name").notNull(),
  expectedMonthlyAmount: decimal("expected_monthly_amount", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("DOP"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("DOP"),
  isActive: boolean("is_active").notNull().default(true),
  // Mixed Ownership: personal (ownerMemberId), business-dedicated (businessId), or shared/household (null)
  ownerMemberId: text("owner_member_id").references(() => householdMembers.id),
  businessId: text("business_id").references(() => businesses.id),
  // Credit card fields
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }),
  availableCredit: decimal("available_credit", { precision: 15, scale: 2 }),
  statementDay: integer("statement_day"),
  paymentDueDay: integer("payment_due_day"),
  minimumPayment: decimal("minimum_payment", { precision: 15, scale: 2 }),
  currentStatementBalance: decimal("current_statement_balance", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: categoryTypeEnum("type").notNull(),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("tag"),
  parentId: text("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id),
  memberId: text("member_id").references(() => householdMembers.id),
  businessId: text("business_id"),
  projectId: text("project_id"),
  categoryId: text("category_id").references(() => categories.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("DOP"),
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 6 }),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  referenceNo: text("reference_no"),
  attachmentUrl: text("attachment_url"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringConfig: jsonb("recurring_config"),
  status: transactionStatusEnum("status").notNull().default("cleared"),
  toAccountId: text("to_account_id").references(() => accounts.id), // for transfers
  // Multi-unit & Concept Tracking
  conceptType: text("concept_type"), // 'material' | 'labor' | 'energy' | 'wear_equipment' | 'profit_draw' | 'operational_expense' | 'income_sale'
  costBreakdown: jsonb("cost_breakdown"), // pocket allocations { material, energy, wearRisk, labor, profit }
  quoteId: text("quote_id"), // linked businessQuote
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── Businesses ───────────────────────────────────────────────────────────────

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"),
  currency: text("currency").notNull().default("DOP"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const businessTransactions = pgTable("business_transactions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  memberId: text("member_id").references(() => householdMembers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const businessCatalogItems = pgTable("business_catalog_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  itemType: text("item_type").notNull(), // 'material' | 'labor' | 'energy' | 'machine' | 'service' | 'addon'
  unit: text("unit").notNull(), // 'gramos' | 'horas' | 'unidades' | 'rollo' | 'resma' | 'copia'
  unitCost: decimal("unit_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  defaultPrice: decimal("default_price", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("DOP"),
  metadata: jsonb("metadata"), // Details: machine purchase cost, lifespan, wattage, courier, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessQuotes = pgTable("business_quotes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => householdMembers.id),
  accountId: text("account_id").references(() => accounts.id),
  clientName: text("client_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull().default("3d_print"), // '3d_print' | 'copy_service' | 'custom' | 'hourly'
  deliveryTime: text("delivery_time"),
  paymentMethod: text("payment_method"),
  currency: text("currency").notNull().default("DOP"),
  lineItems: jsonb("line_items"),
  materialTotal: decimal("material_total", { precision: 15, scale: 2 }).notNull().default("0"),
  energyTotal: decimal("energy_total", { precision: 15, scale: 2 }).notNull().default("0"),
  wearRiskTotal: decimal("wear_risk_total", { precision: 15, scale: 2 }).notNull().default("0"),
  laborTotal: decimal("labor_total", { precision: 15, scale: 2 }).notNull().default("0"),
  overheadTotal: decimal("overhead_total", { precision: 15, scale: 2 }).notNull().default("0"),
  profitTotal: decimal("profit_total", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paymentStatus: text("payment_status").notNull().default("quote"), // 'quote' | 'pending' | 'partial' | 'paid'
  paidPercentage: decimal("paid_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => householdMembers.id),
  businessId: text("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("DOP"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: projectStatusEnum("status").notNull().default("active"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const projectTransactions = pgTable("project_transactions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Loans ────────────────────────────────────────────────────────────────────

export const loans = pgTable("loans", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lenderType: lenderTypeEnum("lender_type").notNull(),
  lenderName: text("lender_name"),
  lenderMemberId: text("lender_member_id").references(() => householdMembers.id),
  borrowerMemberId: text("borrower_member_id").references(() => householdMembers.id),
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(),
  remainingBalance: decimal("remaining_balance", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 7, scale: 4 }).notNull().default("0"),
  interestType: interestTypeEnum("interest_type").notNull().default("fixed"),
  monthlyPayment: decimal("monthly_payment", { precision: 15, scale: 2 }),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  accountId: text("account_id").references(() => accounts.id),
  currency: text("currency").notNull().default("DOP"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const loanPayments = pgTable("loan_payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  loanId: text("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  transactionId: text("transaction_id").references(() => transactions.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  principalPaid: decimal("principal_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  interestPaid: decimal("interest_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Reconciliation ───────────────────────────────────────────────────────────

export const reconciliationEntries = pgTable("reconciliation_entries", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id),
  date: timestamp("date", { withTimezone: true }).notNull(),
  expectedBalance: decimal("expected_balance", { precision: 15, scale: 2 }).notNull(),
  actualBalance: decimal("actual_balance", { precision: 15, scale: 2 }).notNull(),
  difference: decimal("difference", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  reconciledBy: text("reconciled_by").notNull(),
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => householdMembers.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
  invitations: many(householdInvitations),
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  businesses: many(businesses),
  catalogItems: many(businessCatalogItems),
  quotes: many(businessQuotes),
  projects: many(projects),
  loans: many(loans),
  reconciliationEntries: many(reconciliationEntries),
  auditLog: many(auditLog),
}));

export const householdMembersRelations = relations(householdMembers, ({ one, many }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  incomeSources: many(memberIncomeSources),
  ownedAccounts: many(accounts),
  transactions: many(transactions),
  businessTransactions: many(businessTransactions),
  quotes: many(businessQuotes),
  projects: many(projects),
  loansAsLender: many(loans, { relationName: "lender" }),
  loansAsBorrower: many(loans, { relationName: "borrower" }),
  auditLog: many(auditLog),
}));

export const householdInvitationsRelations = relations(householdInvitations, ({ one }) => ({
  household: one(households, {
    fields: [householdInvitations.householdId],
    references: [households.id],
  }),
}));

export const memberIncomeSourcesRelations = relations(memberIncomeSources, ({ one }) => ({
  member: one(householdMembers, {
    fields: [memberIncomeSources.memberId],
    references: [householdMembers.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  household: one(households, {
    fields: [accounts.householdId],
    references: [households.id],
  }),
  ownerMember: one(householdMembers, {
    fields: [accounts.ownerMemberId],
    references: [householdMembers.id],
  }),
  business: one(businesses, {
    fields: [accounts.businessId],
    references: [businesses.id],
  }),
  transactions: many(transactions, { relationName: "accountTransactions" }),
  toTransactions: many(transactions, { relationName: "toAccountTransactions" }),
  loans: many(loans),
  reconciliationEntries: many(reconciliationEntries),
  quotes: many(businessQuotes),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  household: one(households, {
    fields: [categories.householdId],
    references: [households.id],
  }),
  transactions: many(transactions),
  businessTransactions: many(businessTransactions),
  projectTransactions: many(projectTransactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  household: one(households, {
    fields: [transactions.householdId],
    references: [households.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
    relationName: "accountTransactions",
  }),
  toAccount: one(accounts, {
    fields: [transactions.toAccountId],
    references: [accounts.id],
    relationName: "toAccountTransactions",
  }),
  member: one(householdMembers, {
    fields: [transactions.memberId],
    references: [householdMembers.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  business: one(businesses, {
    fields: [transactions.businessId],
    references: [businesses.id],
  }),
  project: one(projects, {
    fields: [transactions.projectId],
    references: [projects.id],
  }),
  quote: one(businessQuotes, {
    fields: [transactions.quoteId],
    references: [businessQuotes.id],
  }),
  loanPayments: many(loanPayments),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  household: one(households, {
    fields: [businesses.householdId],
    references: [households.id],
  }),
  transactions: many(businessTransactions),
  projects: many(projects),
  catalogItems: many(businessCatalogItems),
  quotes: many(businessQuotes),
  dedicatedAccounts: many(accounts),
}));

export const businessCatalogItemsRelations = relations(businessCatalogItems, ({ one }) => ({
  household: one(households, {
    fields: [businessCatalogItems.householdId],
    references: [households.id],
  }),
  business: one(businesses, {
    fields: [businessCatalogItems.businessId],
    references: [businesses.id],
  }),
}));

export const businessQuotesRelations = relations(businessQuotes, ({ one, many }) => ({
  household: one(households, {
    fields: [businessQuotes.householdId],
    references: [households.id],
  }),
  business: one(businesses, {
    fields: [businessQuotes.businessId],
    references: [businesses.id],
  }),
  member: one(householdMembers, {
    fields: [businessQuotes.memberId],
    references: [householdMembers.id],
  }),
  account: one(accounts, {
    fields: [businessQuotes.accountId],
    references: [accounts.id],
  }),
  transactions: many(transactions),
}));

export const businessTransactionsRelations = relations(businessTransactions, ({ one }) => ({
  business: one(businesses, {
    fields: [businessTransactions.businessId],
    references: [businesses.id],
  }),
  category: one(categories, {
    fields: [businessTransactions.categoryId],
    references: [categories.id],
  }),
  member: one(householdMembers, {
    fields: [businessTransactions.memberId],
    references: [householdMembers.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  household: one(households, {
    fields: [projects.householdId],
    references: [households.id],
  }),
  member: one(householdMembers, {
    fields: [projects.memberId],
    references: [householdMembers.id],
  }),
  business: one(businesses, {
    fields: [projects.businessId],
    references: [businesses.id],
  }),
  transactions: many(projectTransactions),
}));

export const projectTransactionsRelations = relations(projectTransactions, ({ one }) => ({
  project: one(projects, {
    fields: [projectTransactions.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [projectTransactions.categoryId],
    references: [categories.id],
  }),
}));

export const loansRelations = relations(loans, ({ one, many }) => ({
  household: one(households, {
    fields: [loans.householdId],
    references: [households.id],
  }),
  lenderMember: one(householdMembers, {
    fields: [loans.lenderMemberId],
    references: [householdMembers.id],
    relationName: "lender",
  }),
  borrowerMember: one(householdMembers, {
    fields: [loans.borrowerMemberId],
    references: [householdMembers.id],
    relationName: "borrower",
  }),
  account: one(accounts, {
    fields: [loans.accountId],
    references: [accounts.id],
  }),
  payments: many(loanPayments),
}));

export const loanPaymentsRelations = relations(loanPayments, ({ one }) => ({
  loan: one(loans, {
    fields: [loanPayments.loanId],
    references: [loans.id],
  }),
  transaction: one(transactions, {
    fields: [loanPayments.transactionId],
    references: [transactions.id],
  }),
}));

export const reconciliationEntriesRelations = relations(reconciliationEntries, ({ one }) => ({
  household: one(households, {
    fields: [reconciliationEntries.householdId],
    references: [households.id],
  }),
  account: one(accounts, {
    fields: [reconciliationEntries.accountId],
    references: [accounts.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  household: one(households, {
    fields: [auditLog.householdId],
    references: [households.id],
  }),
  member: one(householdMembers, {
    fields: [auditLog.memberId],
    references: [householdMembers.id],
  }),
}));

