import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autenticación | ACHouse",
  description: "Inicia sesión o crea una cuenta en ACHouse",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
