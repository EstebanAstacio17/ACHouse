import type { Metadata } from "next";
import { BusinessesClient } from "@/components/businesses/BusinessesClient";
export const metadata: Metadata = { title: "Negocios" };
export default function BusinessesPage() { return <BusinessesClient />; }
