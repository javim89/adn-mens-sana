import { defineConfig } from "prisma/config";

// In local dev, load .env.local so Prisma CLI picks up Next.js env vars.
// In production (Netlify/CI), env vars are already set by the platform.
if (process.env.NODE_ENV !== "production") {
  try {
    const { config } = await import("dotenv");
    config({ path: ".env.local", override: false });
  } catch {
    // dotenv not installed — skip
  }
}

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
