// ─── Re-exports from DB schema types ─────────────────────────────────────────
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

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
