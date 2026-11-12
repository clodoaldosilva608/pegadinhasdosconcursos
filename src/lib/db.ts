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

// Bootstrap do schema (serverless-safe).
// Na Vercel o banco vive em /tmp e nasce vazio a cada instância fria —
// garantimos as tabelas + a linha seed da conta antes da primeira consulta.
// No sandbox/local as tabelas já existem (prisma db push) e isso é no-op.
async function createSchema(): Promise<void> {
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Account" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'internal',
      "planLabel" TEXT NOT NULL DEFAULT 'Conta interna',
      "analysesLeft" INTEGER NOT NULL DEFAULT 988,
      "noDeadline" BOOLEAN NOT NULL DEFAULT true,
      "updatedAt" DATETIME NOT NULL
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Analysis" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "banca" TEXT NOT NULL,
      "organization" TEXT NOT NULL DEFAULT '',
      "questionText" TEXT NOT NULL,
      "correctLetter" TEXT NOT NULL,
      "userMarked" TEXT,
      "optionsJson" TEXT NOT NULL,
      "resultJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Purchase" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "plan" TEXT NOT NULL DEFAULT 'lifetime',
      "status" TEXT NOT NULL DEFAULT 'approved',
      "provider" TEXT NOT NULL DEFAULT 'cakto',
      "refId" TEXT,
      "amountCents" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_email_plan_key" ON "Purchase"("email", "plan")`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Purchase_email_idx" ON "Purchase"("email")`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Lead" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "whatsapp" TEXT,
      "consent" BOOLEAN NOT NULL DEFAULT false,
      "source" TEXT NOT NULL DEFAULT 'landing',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Lead_email_key" ON "Lead"("email")`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "SiteConfig" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "SupportMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "message" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'new',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SupportMessage_status_idx" ON "SupportMessage"("status")`
  );
  await db.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "Account" ("id", "planLabel", "analysesLeft", "noDeadline", "updatedAt")
     VALUES ('internal', 'Conta interna', 988, 1, ?)`,
    Date.now()
  );
}

const globalForSchema = globalThis as unknown as {
  __dpSchemaReady?: Promise<void>;
};

export async function dbReady(): Promise<PrismaClient> {
  if (!globalForSchema.__dpSchemaReady) {
    globalForSchema.__dpSchemaReady = createSchema().catch((err) => {
      globalForSchema.__dpSchemaReady = undefined;
      throw err;
    });
  }
  await globalForSchema.__dpSchemaReady;
  return db;
}
