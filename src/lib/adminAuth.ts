// Autenticação do painel admin (/admin).
// Sessão stateless via cookie HttpOnly assinado com HMAC-SHA256
// (mesma técnica do acesso pago, com escopo próprio "admin").
//
// Credenciais: env ADMIN_EMAIL / ADMIN_PASSWORD — com os valores informados
// pelo dono do produto como fallback (trocar/rotacionar depois).

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/access";

export const ADMIN_COOKIE = "dp-admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL || "clodoaldo608@gmail.com").toLowerCase();
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "Silva88677488";
}

function adminSecret(): string {
  return process.env.ADMIN_SECRET || process.env.ACCESS_TOKEN_SECRET || "dp-dev-admin-secret";
}

export function checkCredentials(email: string, password: string): boolean {
  const okEmail = safeEqual(email.trim().toLowerCase(), adminEmail());
  const okPass = safeEqual(password, adminPassword());
  return okEmail && okPass;
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
