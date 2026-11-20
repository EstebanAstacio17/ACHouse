// ─── Re-exports from DB schema types ─────────────────────────────────────────
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { z } from "zod";

// ─── Household Types ──────────────────────────────────────────────────────────

export type MemberRole = "admin" | "contributor" | "viewer";

export type Household = {
  id: string;
  name: string;
  defaultCurrency: string;
  timezone: string;
  country?: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const createHouseholdSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  currency: z.string().length(3),
  timezone: z.string(),
  country: z.string().optional(),
});

export type HouseholdMember = {
  id: string;
  householdId: string;
  clerkUserId: string;
  role: MemberRole;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  joinedAt: Date;
};

export type HouseholdInvitation = {
  id: string;
  householdId: string;
  email: string;
  role: MemberRole;
  token: string;
  invitedBy: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Date;
  createdAt: Date;
};

// ─── Account Types ────────────────────────────────────────────────────────────

export type AccountType = "checking" | "savings" | "credit" | "cash";

export type Account = {
  id: string;
  householdId: string;
  name: string;
  type: AccountType;
  balance: string;
  currency: string;
  isActive: boolean;
  ownerMemberId?: string | null;
  businessId?: string | null;
  creditLimit: string | null;
  availableCredit: string | null;
  statementDay: number | null;
  paymentDueDay: number | null;
  minimumPayment: string | null;
  currentStatementBalance: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

// ─── Transaction Types ────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "cleared" | "reconciled";

export type ConceptType =
  | "material"
  | "labor"
  | "energy"
  | "wear_equipment"
  | "profit_draw"
  | "operational_expense"
  | "income_sale"
  | "transfer_draw";

export type Transaction = {
  id: string;
  householdId: string;
  accountId: string;
  memberId: string | null;
  businessId: string | null;
  projectId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  exchangeRate: string | null;
  description: string;
  date: Date;
  referenceNo: string | null;
  attachmentUrl: string | null;
  isRecurring: boolean;
  recurringConfig: RecurringConfig | null;
  status: TransactionStatus;
  toAccountId: string | null;
  conceptType?: string | null;
  costBreakdown?: Record<string, any> | null;
  quoteId?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type RecurringConfig = {
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  interval: number;
  endDate?: string;
  maxOccurrences?: number;
};

export const transactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  businessId: z.string().optional(),
  projectId: z.string().optional(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("DOP"),
  description: z.string().min(1).max(255),
  date: z.string(),
  referenceNo: z.string().optional(),
  status: z.enum(["pending", "cleared", "reconciled"]).default("cleared"),
  isRecurring: z.boolean().default(false),
  toAccountId: z.string().optional(),
  conceptType: z.string().optional(),
  costBreakdown: z.record(z.any()).optional(),
  quoteId: z.string().optional(),
});

// ─── Category Types ───────────────────────────────────────────────────────────

export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  householdId: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
};

// ─── Business Types ───────────────────────────────────────────────────────────

export type Business = {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  type: string | null;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
};

// ─── Business Catalog & Quoter Types ──────────────────────────────────────────

export type CatalogItemType = "material" | "labor" | "energy" | "machine" | "service" | "addon";

export type BusinessCatalogItem = {
  id: string;
  householdId: string;
  businessId: string;
  name: string;
  itemType: CatalogItemType;
  unit: string;
  unitCost: string;
  defaultPrice: string | null;
  currency: string;
  metadata: Record<string, any> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const businessCatalogItemSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(100),
  itemType: z.enum(["material", "labor", "energy", "machine", "service", "addon"]),
  unit: z.string().min(1).max(30),
  unitCost: z.coerce.number().min(0).default(0),
  defaultPrice: z.coerce.number().optional(),
  currency: z.string().length(3).default("DOP"),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

export type QuoteTemplateType = "3d_print" | "copy_service" | "hourly" | "custom";
export type QuotePaymentStatus = "quote" | "pending" | "partial" | "paid";

export type BusinessQuote = {
  id: string;
  householdId: string;
  businessId: string;
  memberId: string | null;
  accountId: string | null;
  clientName: string;
  title: string;
  description: string | null;
  templateType: QuoteTemplateType;
  deliveryTime: string | null;
  paymentMethod: string | null;
  currency: string;
  lineItems: any;
  materialTotal: string;
  energyTotal: string;
  wearRiskTotal: string;
  laborTotal: string;
  overheadTotal: string;
  profitTotal: string;
  totalAmount: string;
  paymentStatus: QuotePaymentStatus;
  paidPercentage: string;
  paidAmount: string;
  remainingAmount: string;
  date: Date;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export const businessQuoteSchema = z.object({
  businessId: z.string().min(1),
  memberId: z.string().optional(),
  accountId: z.string().optional(),
  clientName: z.string().min(1).max(100),
  title: z.string().min(1).max(150),
  description: z.string().optional(),
  templateType: z.enum(["3d_print", "copy_service", "hourly", "custom"]).default("3d_print"),
  deliveryTime: z.string().optional(),
  paymentMethod: z.string().optional(),
  currency: z.string().length(3).default("DOP"),
  lineItems: z.any().optional(),
  materialTotal: z.coerce.number().min(0).default(0),
  energyTotal: z.coerce.number().min(0).default(0),
  wearRiskTotal: z.coerce.number().min(0).default(0),
  laborTotal: z.coerce.number().min(0).default(0),
  overheadTotal: z.coerce.number().min(0).default(0),
  profitTotal: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0),
  paymentStatus: z.enum(["quote", "pending", "partial", "paid"]).default("quote"),
  paidPercentage: z.coerce.number().min(0).max(100).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  remainingAmount: z.coerce.number().min(0).default(0),
  date: z.string().optional(),
  dueDate: z.string().optional(),
});

// ─── Project Types ────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "paused" | "completed" | "cancelled";

export type Project = {
  id: string;
  householdId: string;
  memberId: string | null;
  businessId: string | null;
  name: string;
  description: string | null;
  budget: string | null;
  currency: string;
  startDate: Date;
  endDate: Date | null;
  status: ProjectStatus;
  completedAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
};

// ─── Loan Types ───────────────────────────────────────────────────────────────

export type LenderType = "bank" | "person" | "internal_member";
export type InterestType = "fixed" | "variable" | "none";

export type Loan = {
  id: string;
  householdId: string;
  name: string;
  lenderType: LenderType;
  lenderName: string | null;
  lenderMemberId: string | null;
  borrowerMemberId: string | null;
  principalAmount: string;
  remainingBalance: string;
  interestRate: string;
  interestType: InterestType;
  monthlyPayment: string | null;
  startDate: Date;
  endDate: Date | null;
  accountId: string | null;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
};

// ─── Dashboard / KPI Types ────────────────────────────────────────────────────

export type DashboardKPIs = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  topCategories: Array<{ name: string; amount: number; color: string }>;
  recentTransactions: Transaction[];
};

// ─── Filter / Query Types ─────────────────────────────────────────────────────

export type TransactionFilters = {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  categoryId?: string;
  memberId?: string;
  accountId?: string;
  status?: TransactionStatus;
  search?: string;
  page?: number;
  perPage?: number;
};
