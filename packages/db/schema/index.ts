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
  defaultCurrency: text("default_currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("UTC"),
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
  currency: text("currency").notNull().default("USD"),
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
  currency: text("currency").notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
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
  currency: text("currency").notNull().default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 6 }),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  referenceNo: text("reference_no"),
  attachmentUrl: text("attachment_url"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringConfig: jsonb("recurring_config"),
  status: transactionStatusEnum("status").notNull().default("cleared"),
  toAccountId: text("to_account_id").references(() => accounts.id), // for transfers
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
  currency: text("currency").notNull().default("USD"),
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

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => householdMembers.id),
  businessId: text("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: projectStatusEnum("status").notNull().default("active"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  currency: text("currency").notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
