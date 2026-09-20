import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ACHouse — Plataforma de Finanzas Familiares",
};

// Root page redirects to marketing page or dashboard
export { default } from "./(marketing)/page";
