import type { Metadata } from "next";
import { CategoriesClient } from "@/components/categories/CategoriesClient";
export const metadata: Metadata = { title: "Categorías" };
export default function CategoriesPage() { return <CategoriesClient />; }
