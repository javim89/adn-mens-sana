/**
 * Prisma client singleton — Neon adapter edition (Prisma 7).
 *
 * Prisma 7 removed built-in connection string handling. Instead, a driver
 * adapter must be passed to the PrismaClient constructor. For Neon we use
 * @prisma/adapter-neon backed by a @neondatabase/serverless Pool.
 *
 * In development, Next.js HMR re-evaluates modules on every change. Without
 * the globalThis guard below, each re-evaluation would create a new Pool and
 * PrismaClient, exhausting the database connection limit quickly. The guard
 * stores the singleton on the global object so it survives module reloads.
 */

import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/lib/generated/prisma/client';

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local before starting the server.',
    );
  }

  // PrismaNeon accepts a PoolConfig and manages the Pool internally.
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
