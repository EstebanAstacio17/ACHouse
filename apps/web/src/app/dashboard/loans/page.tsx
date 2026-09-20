import type { Metadata } from "next";
import { LoansClient } from "@/components/loans/LoansClient";
export const metadata: Metadata = { title: "Préstamos" };
export default function LoansPage() { return <LoansClient />; }
