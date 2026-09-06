import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env, isDevelopment } from "@/server/env";

/**
 * A single Prisma client for the whole process.
 *
 * Next.js reloads modules on every edit in development, so the client is cached
 * on globalThis to avoid opening a new connection pool on each reload.
 *
 * Nothing outside src/server/repositories should import this. Route handlers,
 * server actions and components go through the repository layer so that data
 * access stays in one place and stays testable.
 */

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });

type PrismaClientInstance = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientInstance;
};

export const prisma: PrismaClientInstance = globalForPrisma.prisma ?? createClient();

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}
