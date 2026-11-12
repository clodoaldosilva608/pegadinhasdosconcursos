// Autenticação do painel admin (/admin).
// Sessão stateless via cookie HttpOnly assinado com HMAC-SHA256
// (mesma técnica do acesso pago, com escopo próprio "admin").
//
// Credenciais (NUNCA no código-fonte — somente variáveis de ambiente):
// - ADMIN_PASSWORD_HASH (preferencial): hash scrypt em
//   `scrypt:N:r:p:saltHex:hashHex` (gerado por scripts/hash_admin_password.mjs;
//   sem "$", à prova da expansão de variáveis do dotenv). O formato antigo
//   `scrypt$N$r$p$saltB64$hashB64` também é aceito;
// - ADMIN_PASSWORD (alternativa): senha direta em env (menos seguro);
// - ADMIN_EMAIL: e-mail do administrador.
// Se nenhuma senha estiver configurada, o login é NEGADO (log de erro).

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/access";

export const ADMIN_COOKIE = "dp-admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL || "clodoaldo608@gmail.com").toLowerCase();
}

function adminPasswordHash(): string | null {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  return hash && (hash.startsWith("scrypt:") || hash.startsWith("scrypt$")) ? hash : null;
}

function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

function adminSecret(): string {
  return process.env.ADMIN_SECRET || process.env.ACCESS_TOKEN_SECRET || "dp-dev-admin-secret";
}

function verifyScrypt(password: string, stored: string): boolean {
  // Formato novo: scrypt:N:r:p:saltHex:hashHex  (sem "$", à prova de dotenv)
  // Formato antigo: scrypt$N$r$p$saltB64$hashB64
  const sep = stored.includes(":") ? ":" : "$";
  const parts = stored.split(sep);
  if (parts.length !== 6) return false;
  const [, Ns, rs, ps, saltPart, hashPart] = parts;
  const N = Number(Ns);
  const r = Number(rs);
  const p = Number(ps);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltPart, sep === ":" ? "hex" : "base64");
    expected = Buffer.from(hashPart, sep === ":" ? "hex" : "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const derived = crypto.scryptSync(password, salt, expected.length, { N, r, p });
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export function checkCredentials(email: string, password: string): boolean {
  const okEmail = safeEqual(email.trim().toLowerCase(), adminEmail());
  if (!okEmail) return false;

  const storedHash = adminPasswordHash();
  if (storedHash) return verifyScrypt(password, storedHash);

  const plain = adminPassword();
  if (plain) return safeEqual(password, plain);

  console.error(
    "[admin] Nenhuma senha configurada: defina ADMIN_PASSWORD_HASH ou ADMIN_PASSWORD nas variáveis de ambiente."
  );
  return false;
}

interface AdminPayload {
  role: "admin";
  exp: number;
}

function b64url(input: Buffer): string {
  return input.toString("base64url");
}

export function createAdminToken(): string {
  const payload: AdminPayload = { role: "admin", exp: Date.now() + SESSION_TTL_MS };
  const data = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", adminSecret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyAdminToken(token: string | undefined | null): AdminPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac("sha256", adminSecret()).update(data).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as AdminPayload;
    if (payload?.role !== "admin" || typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Null = autorizado; NextResponse = negado (401). */
export function adminDenied(req: NextRequest): NextResponse | null {
  const payload = verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (payload) return null;
  return NextResponse.json(
    { ok: false, error: "ADMIN_AUTH_REQUIRED", message: "Faça login no painel." },
    { status: 401 }
  );
}

export function withAdminCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return res;
}

export function clearAdminCookie(res: NextResponse): NextResponse {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return res;
}
