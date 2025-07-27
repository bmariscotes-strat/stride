import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({
  path:
    process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
});

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
