"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SessionSecurityProvider } from "@/components/shared/SessionSecurityProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SessionSecurityProvider>
      <div className="dashboard-layout">
        <Sidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
        <div className="main-content">
          <Header onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)} />
          <main className="page-content">{children}</main>
        </div>
      </div>
    </SessionSecurityProvider>
  );
}

