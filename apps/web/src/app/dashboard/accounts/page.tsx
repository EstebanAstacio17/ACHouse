import type { Metadata } from "next";
import { AccountsClient } from "@/components/accounts/AccountsClient";
export const metadata: Metadata = { title: "Cuentas" };
export default function AccountsPage() { return <AccountsClient />; }
