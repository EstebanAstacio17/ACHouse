import type { Metadata } from "next";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";
import { getTransactions } from "@/lib/actions/transactions";
import { getAccounts, getCategories, getMembers } from "@/lib/actions/entities";
import { getBusinessList } from "@/lib/actions/businesses-projects-loans";
import { getActiveHousehold } from "@/lib/household";

export const metadata: Metadata = { title: "Transacciones" };

export default async function TransactionsPage() {
  try {
    const [txs, accs, cats, mems, bizs, household] = await Promise.all([
      getTransactions({ perPage: 0 }),
      getAccounts(),
      getCategories(),
      getMembers(),
      getBusinessList(),
      getActiveHousehold(),
    ]);

    return (
      <TransactionsClient
        initialTransactions={txs || []}
        initialAccounts={accs || []}
        initialCategories={cats || []}
        initialMembers={mems || []}
        initialBusinesses={bizs || []}
        initialCurrency={household?.defaultCurrency || "DOP"}
      />
    );
  } catch {
    return <TransactionsClient />;
  }
}
