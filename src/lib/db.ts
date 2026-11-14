import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? [] : ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Hardening (2026-11): o schema passou a ser gerenciado exclusivamente por
// migrations/db push usando DIRECT_DATABASE_URL (role admin). O role de runtime
// (pegadinhas_app) é de menor privilégio — CRUD apenas, sem DDL — portanto o
// antigo bootstrap com CREATE TABLE IF NOT EXISTS em runtime foi removido.
// As tabelas e a linha-seed da conta interna já existem em produção.
export async function dbReady(): Promise<PrismaClient> {
  await db.$queryRaw`SELECT 1`;
  return db;
}
