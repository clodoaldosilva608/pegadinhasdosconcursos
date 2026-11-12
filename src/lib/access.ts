// Controle de acesso pago (Cakto + Pix).
//
// Estratégia stateless: quando uma compra é aprovada, emitimos um token
// assinado com HMAC-SHA256 (ACCESS_TOKEN_SECRET) contendo {email, plan, exp}.
// As rotas protegidas validam apenas a assinatura e a validade — sem depender
// do banco (que na Vercel vive em /tmp e nasce vazio a cada instância fria).
// O banco "Purchase" existe para EMITIR tokens (webhook + verificação por
// e-mail + consulta ao vivo na API da Cakto) e para reembolsos.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";

export type AccessPlan = "lifetime" | "pass30";

export interface AccessPayload {
  email: string;
  plan: AccessPlan;
  exp: number; // epoch ms
}

const DEV_FALLBACK_SECRET = "dp-dev-access-secret";

export function getAccessSecret(): string | null {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (secret && secret.length >= 8) return secret;
  if (process.env.NODE_ENV === "production") {
    console.error("[access] ACCESS_TOKEN_SECRET ausente em produção — acessos ficarão bloqueados");
    return null;
  }
  return DEV_FALLBACK_SECRET;
}

function b64url(input: Buffer): string {
  return input.toString("base64url");
}

export function signAccessToken(payload: AccessPayload): string | null {
  const secret = getAccessSecret();
  if (!secret) return null;
  const data = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyAccessToken(token: string | null | undefined): AccessPayload | null {
  const secret = getAccessSecret();
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(data).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as AccessPayload;
    if (!payload || typeof payload.email !== "string" || typeof payload.plan !== "string") return null;
    if (payload.plan !== "lifetime" && payload.plan !== "pass30") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw);
}

// Vitalício: 10 anos. Passe 30 dias: compra + 35 dias de folga.
export function planExpiry(plan: AccessPlan, fromMs: number): number {
  return plan === "lifetime" ? fromMs + 10 * 365 * 24 * 3600 * 1000 : fromMs + 35 * 24 * 3600 * 1000;
}

// Usada no topo das rotas protegidas: null = liberado.
// Valida o token (stateless) e, quando o banco está disponível, confere se o
// e-mail não foi revogado (reembolso/chargeback/cancelamento).
export async function requireAccess(req: NextRequest): Promise<NextResponse | null> {
  const payload = verifyAccessToken(req.headers.get("x-access-token"));
  if (!payload) {
    return NextResponse.json(
      {
        error: "ACCESS_REQUIRED",
        message: "Acesso exclusivo para quem já pagou. Faça o Pix para liberar o Detector.",
      },
      { status: 401 }
    );
  }
  try {
    const db = await dbReady();
    const revoked = await db.purchase.findFirst({
      where: { email: payload.email, status: "refunded" },
      select: { id: true },
    });
    if (revoked) {
      return NextResponse.json(
        {
          error: "ACCESS_REVOKED",
          message:
            "Este acesso foi reembolsado/cancelado. Para continuar, faça um novo pagamento ou fale com o suporte.",
        },
        { status: 401 }
      );
    }
  } catch {
    // Banco indisponível (instância fria): o token assinado permanece válido.
  }
  return null;
}

export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ===== Cakto: determinação de plano =====

export function planFromCaktoPayload(data: Record<string, unknown>): AccessPlan {
  const ids = [
    (data as { product?: { id?: unknown; short_id?: unknown } })?.product?.id,
    (data as { product?: { short_id?: unknown } })?.product?.short_id,
    (data as { offer?: { id?: unknown } })?.offer?.id,
  ].map((v) => String(v ?? ""));
  const life = process.env.CAKTO_PRODUCT_ID_LIFETIME;
  const pass = process.env.CAKTO_PRODUCT_ID_PASS30;
  if (life && ids.includes(life)) return "lifetime";
  if (pass && ids.includes(pass)) return "pass30";
  const amount = Number(
    (data as { amount?: unknown })?.amount ??
      (data as { offer?: { price?: unknown } })?.offer?.price ??
      0
  );
  if (!Number.isFinite(amount) || amount <= 0) return "lifetime";
  return amount >= 20 ? "lifetime" : "pass30";
}

// ===== Cakto: consulta ao vivo de pedidos (fallback quando o webhook não chegou) =====

interface CaktoTokenCache {
  token: string;
  exp: number;
}

const globalForCakto = globalThis as unknown as { __dpCaktoToken?: CaktoTokenCache };

async function getCaktoToken(): Promise<string | null> {
  const clientId = process.env.CAKTO_CLIENT_ID;
  const clientSecret = process.env.CAKTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const cached = globalForCakto.__dpCaktoToken;
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://api.cakto.com.br/public_api/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Cakto token ${res.status}`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Cakto token sem access_token");
  const exp = Date.now() + (Number(data.expires_in) || 36_000) * 1000;
  globalForCakto.__dpCaktoToken = { token: data.access_token, exp };
  return data.access_token;
}

export interface CaktoPaidOrder {
  plan: AccessPlan;
  paidAtMs: number | null;
  amountCents: number | null;
  refId: string | null;
}

export async function caktoPaidOrders(email: string): Promise<CaktoPaidOrder[]> {
  const token = await getCaktoToken();
  if (!token) return [];
  const res = await fetch(
    `https://api.cakto.com.br/public_api/orders/?customer=${encodeURIComponent(email)}&status=paid`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`Cakto orders ${res.status}`);
  const data = (await res.json()) as { results?: unknown };
  const results = Array.isArray(data.results) ? data.results : [];
  const out: CaktoPaidOrder[] = [];
  for (const raw of results) {
    const o = raw as {
      amount?: number;
      refId?: string;
      id?: string;
      paidAt?: string;
      createdAt?: string;
      product?: { id?: string };
    };
    const plan = planFromCaktoPayload(o as unknown as Record<string, unknown>);
    const paidAtMs = o.paidAt || o.createdAt ? new Date(o.paidAt || o.createdAt || "").getTime() : NaN;
    out.push({
      plan,
      paidAtMs: Number.isFinite(paidAtMs) ? paidAtMs : null,
      amountCents: Number.isFinite(Number(o.amount)) ? Math.round(Number(o.amount) * 100) : null,
      refId: o.refId ?? o.id ?? null,
    });
  }
  return out;
}

// ===== Rate limit simples em memória (por instância; proteção básica) =====

const globalForRate = globalThis as unknown as {
  __dpVerifyRate?: Map<string, { count: number; resetAt: number }>;
};

export function rateLimitHit(ip: string, limit = 20, windowMs = 5 * 60 * 1000): boolean {
  const store = (globalForRate.__dpVerifyRate ??= new Map());
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "desconhecido"
  );
}

// ===== Persistência das compras =====

export async function upsertApprovedPurchase(opts: {
  email: string;
  plan: AccessPlan;
  refId?: string | null;
  amountCents?: number | null;
  paidAtMs?: number | null;
}): Promise<void> {
  const db = await dbReady();
  const createdAt = opts.paidAtMs && opts.paidAtMs > 0 ? new Date(opts.paidAtMs) : undefined;
  await db.purchase.upsert({
    where: { email_plan: { email: opts.email, plan: opts.plan } },
    update: { status: "approved", refId: opts.refId ?? undefined, amountCents: opts.amountCents ?? undefined },
    create: {
      email: opts.email,
      plan: opts.plan,
      status: "approved",
      provider: "cakto",
      refId: opts.refId ?? null,
      amountCents: opts.amountCents ?? null,
      ...(createdAt ? { createdAt } : {}),
    },
  });
}
