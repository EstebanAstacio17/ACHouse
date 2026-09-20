import type { Metadata } from "next";
import { ProjectsClient } from "@/components/projects/ProjectsClient";
export const metadata: Metadata = { title: "Proyectos" };
export default function ProjectsPage() { return <ProjectsClient />; }
