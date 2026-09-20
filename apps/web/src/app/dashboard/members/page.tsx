import type { Metadata } from "next";
import { MembersClient } from "@/components/members/MembersClient";
export const metadata: Metadata = { title: "Integrantes" };
export default function MembersPage() { return <MembersClient />; }
