import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as path from "node:path";

const rootPath = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootPath, "apps/web/.env.local") });
dotenv.config({ path: path.join(rootPath, ".env.local") });
dotenv.config({ path: path.join(rootPath, ".env") });

export default {
  schema: "./schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
