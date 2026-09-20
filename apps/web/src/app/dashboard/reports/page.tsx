import type { Metadata } from "next";
import { ReportsClient } from "@/components/reports/ReportsClient";

export const metadata: Metadata = {
  title: "Reportes y Conciliación",
};

export default function ReportsPage() {
  return <ReportsClient />;
}
