// Autenticação de usuários da plataforma (/entrar): e-mail + senha.
// - Senha: scrypt no formato `scrypt:N:r:p:saltHex:hashHex` (mesmo padrão do
//   admin — nunca texto puro no banco, nunca "$" à prova do dotenv).
// - Sessão: cookie HttpOnly "dp-user" assinado com HMAC-SHA256, TTL 30 dias
//   (mesma técnica do acesso pago e do painel admin, com escopo "user").
// - Sinergia com a compra: se o e-mail da conta tem compra aprovada
//   (Purchase), o login/registro emite o MESMO token de acesso pago
//   (signAccessToken) — entrar com a conta restaura o acesso comprado em
//   qualquer aparelho, sem repetir o "Já paguei".

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import {
  planExpiry,
  signAccessToken,
  type AccessPayload,
  type AccessPlan,
} from "@/lib/access";

export const USER_COOKIE = "dp-user";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;

function userSecret(): string {
  return process.env.USER_AUTH_SECRET || process.env.ACCESS_TOKEN_SECRET || "dp-dev-user-secret";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt:${SCRYPT.N}:${SCRYPT.r}:${SCRYPT.p}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "hex");
    expected = Buffer.from(parts[5], "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const derived = crypto.scryptSync(password, salt, expected.length, { N, r, p });
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

interface UserPayload {
  role: "user";
  email: string;
  exp: number;
}

function b64url(input: Buffer): string {
  return input.toString("base64url");
}

export function createUserToken(email: string): string {
  const payload: UserPayload = { role: "user", email, exp: Date.now() + SESSION_TTL_MS };
  const data = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", userSecret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyUserToken(token: string | undefined | null): UserPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac("sha256", userSecret()).update(data).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as UserPayload;
    if (payload?.role !== "user" || typeof payload.email !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** E-mail da sessão de usuário (cookie), ou null. */
export function sessionEmail(req: NextRequest): string | null {
  const payload = verifyUserToken(req.cookies.get(USER_COOKIE)?.value);
  return payload?.email ?? null;
}

export function withUserCookie(res: NextResponse, email: string): NextResponse {
  res.cookies.set(USER_COOKIE, createUserToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return res;
}

export function clearUserCookie(res: NextResponse): NextResponse {
  res.cookies.set(USER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return res;
}

/**
 * Melhor compra aprovada do e-mail: vitalício vence; senão a mais recente.
 * Retorna o payload do acesso pago (mesmo formato do /api/access/verify) ou
 * null quando não há compra válida (conta sem pagamento, passe expirado,
 * banco indisponível).
 */
export async function bestPurchaseAccess(email: string): Promise<AccessPayload | null> {
  try {
    const db = await dbReady();
    const purchases = await db.purchase.findMany({
      where: { email, status: "approved" },
      orderBy: { createdAt: "desc" },
      select: { plan: true, createdAt: true },
    });
    if (purchases.length === 0) return null;
    const lifetime = purchases.find((p) => p.plan === "lifetime");
    const chosen = lifetime ?? purchases[0];
    const plan = chosen.plan as AccessPlan;
    const baseMs = chosen.createdAt ? new Date(chosen.createdAt).getTime() : Date.now();
    const exp = planExpiry(plan, baseMs);
    if (exp <= Date.now()) return null;
    return { email, plan, exp };
  } catch (error) {
    console.error("[userAuth] bestPurchaseAccess:", error);
    return null;
  }
}

/** Token de acesso pago serializado para o cliente (ou null sem secret). */
export function accessForClient(payload: AccessPayload): {
  token: string;
  email: string;
  plan: string;
  expiresAt: string;
} | null {
  const token = signAccessToken(payload);
  if (!token) return null;
  return {
    token,
    email: payload.email,
    plan: payload.plan,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

/**
 * Melhor plano aprovado por e-mail, em lote (painel admin — seção Contas).
 * Vitalício vence; senão o mais recente. expiresAt null = passe vencido.
 */
export async function bestPurchasePlanMap(
  emails: string[]
): Promise<Map<string, { plan: AccessPlan; expiresAt: string | null }>> {
  const out = new Map<string, { plan: AccessPlan; expiresAt: string | null }>();
  if (emails.length === 0) return out;
  try {
    const db = await dbReady();
    const purchases = await db.purchase.findMany({
      where: { email: { in: emails }, status: "approved" },
      orderBy: { createdAt: "desc" },
      select: { email: true, plan: true, createdAt: true },
    });
    for (const email of emails) {
      const rows = purchases.filter((p) => p.email === email);
      if (rows.length === 0) continue;
      const lifetime = rows.find((r) => r.plan === "lifetime");
      const chosen = lifetime ?? rows[0];
      const plan = chosen.plan as AccessPlan;
      const baseMs = chosen.createdAt ? new Date(chosen.createdAt).getTime() : Date.now();
      const exp = planExpiry(plan, baseMs);
      out.set(email, { plan, expiresAt: exp > Date.now() ? new Date(exp).toISOString() : null });
    }
  } catch (error) {
    console.error("[userAuth] bestPurchasePlanMap:", error);
  }
  return out;
}
