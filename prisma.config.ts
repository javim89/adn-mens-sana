import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local (Next.js convention) for Prisma CLI commands.
// Must use override: false so production env vars are not overwritten.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use the direct (unpooled) URL for migrations and introspection.
    // Pooled connections do not support DDL statements required by Migrate.
    url: process.env["DATABASE_URL_UNPOOLED"],
  },
});
