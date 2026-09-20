import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL.startsWith("postgres") &&
  !process.env.DATABASE_URL.includes("REEMPLAZAR")
    ? process.env.DATABASE_URL
    : "postgresql://placeholder:placeholder@ep-placeholder.us-east-2.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export * from "./schema";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";
