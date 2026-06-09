/**
 * Smoke test for lib/db.ts
 *
 * Verifies that:
 * 1. The module exports a valid PrismaClient-like object (not null/undefined,
 *    and has the standard Prisma client methods).
 * 2. The singleton pattern returns the same reference on repeated imports.
 *
 * No real database connection is made — Pool and PrismaNeon are instantiated
 * lazily and do not open sockets until a query is executed.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Set a dummy connection string before any module that reads DATABASE_URL is
// evaluated. In a real environment this comes from .env.local.
beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      'postgresql://test:test@localhost:5432/test?sslmode=require';
  }
});

describe('Prisma client singleton (lib/db.ts)', () => {
  it('exports a valid PrismaClient instance with expected methods', async () => {
    const { prisma } = await import('@/lib/db');

    // The prisma singleton must exist and expose the standard Prisma Client API.
    expect(prisma).toBeDefined();
    expect(prisma).not.toBeNull();
    expect(typeof prisma.$connect).toBe('function');
    expect(typeof prisma.$disconnect).toBe('function');
    expect(typeof prisma.$transaction).toBe('function');
    expect(typeof prisma.$executeRaw).toBe('function');
    expect(typeof prisma.$queryRaw).toBe('function');
  });

  it('reuses the same instance across imports', async () => {
    const { prisma: prisma1 } = await import('@/lib/db');
    const { prisma: prisma2 } = await import('@/lib/db');
    expect(prisma1).toBe(prisma2);
  });
});
