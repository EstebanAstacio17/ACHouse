import type { Metadata } from "next";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";

export const metadata: Metadata = { title: "Transacciones" };

export default function TransactionsPage() {
  return <TransactionsClient />;
}
