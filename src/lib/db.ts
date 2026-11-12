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

// Bootstrap do schema (serverless-safe, Supabase/Postgres).
// Idempotente: garante as tabelas + a linha seed da conta antes da primeira
// consulta. Em produção as tabelas já existem (prisma db push) e isso é no-op.
async function createSchema(): Promise<void> {
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Account" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'internal',
      "planLabel" TEXT NOT NULL DEFAULT 'Conta interna',
      "analysesLeft" INTEGER NOT NULL DEFAULT 988,
      "noDeadline" BOOLEAN NOT NULL DEFAULT true,
      "updatedAt" TIMESTAMP(3) NOT NULL
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
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Lead_email_key" ON "Lead"("email")`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "SiteConfig" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "SupportMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "message" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'new',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SupportMessage_status_idx" ON "SupportMessage"("status")`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "AbandonedCheckout" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "plan" TEXT NOT NULL,
      "phone" TEXT,
      "productRef" TEXT,
      "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "recoveredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "AbandonedCheckout_email_plan_key" ON "AbandonedCheckout"("email", "plan")`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AbandonedCheckout_email_idx" ON "AbandonedCheckout"("email")`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "AppUser" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "deviceId" TEXT NOT NULL,
      "plan" TEXT NOT NULL DEFAULT 'free',
      "email" TEXT,
      "userAgent" TEXT,
      "visits" INTEGER NOT NULL DEFAULT 1,
      "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_deviceId_key" ON "AppUser"("deviceId")`
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "AuthUser" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      "lastLoginAt" TIMESTAMP(3)
    )`
  );
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "AuthUser_email_key" ON "AuthUser"("email")`
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "Account" ("id", "planLabel", "analysesLeft", "noDeadline", "updatedAt")
     VALUES ('internal', 'Conta interna', 988, true, $1)
     ON CONFLICT ("id") DO NOTHING`,
    new Date()
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
