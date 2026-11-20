import type { Metadata } from "next";
import { LoansClient } from "@/components/loans/LoansClient";
import { getLoans } from "@/lib/actions/businesses-projects-loans";
import { getAccounts, getMembers } from "@/lib/actions/entities";

export const metadata: Metadata = { title: "Préstamos" };

export default async function LoansPage() {
  const [loans, accounts, members] = await Promise.all([
    getLoans().catch(() => []),
    getAccounts().catch(() => []),
    getMembers().catch(() => []),
  ]);

  return (
    <LoansClient
      initialLoans={loans || []}
      initialAccounts={accounts || []}
      initialMembers={members || []}
    />
  );
}
