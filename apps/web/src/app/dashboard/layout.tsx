import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | ACHouse",
    template: "%s | ACHouse",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

