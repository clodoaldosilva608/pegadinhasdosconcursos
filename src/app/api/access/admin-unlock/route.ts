// Desbloqueio manual (suporte). Usado quando o webhook falha e o usuário
// já comprovou o pagamento por outro canal.
// POST { email, plan?, secret } — secret = env ADMIN_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import {
  getAccessSecret,
  isEmail,
  normalizeEmail,
  planExpiry,
  safeEqual,
  signAccessToken,
  upsertApprovedPurchase,
  type AccessPlan,
} from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; plan?: string; secret?: string }
    | null;

  const adminSecret = process.env.ADMIN_SECRET ?? "";
  if (!adminSecret || !safeEqual(String(body?.secret ?? ""), adminSecret)) {
    return NextResponse.json({ ok: false, error: "Secret inválido" }, { status: 401 });
  }

  const email = normalizeEmail(String(body?.email ?? ""));
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "E-mail inválido" }, { status: 400 });
  }

  const plan: AccessPlan = body?.plan === "pass30" ? "pass30" : "lifetime";
  if (!getAccessSecret()) {
    return NextResponse.json({ ok: false, error: "Servidor em configuração" }, { status: 503 });
  }

  try {
    await upsertApprovedPurchase({ email, plan, refId: "admin-unlock" });
    const exp = planExpiry(plan, Date.now());
    const token = signAccessToken({ email, plan, exp });
    return NextResponse.json({ ok: true, token, plan, email, expiresAt: new Date(exp).toISOString() });
  } catch (error) {
    console.error("[access/admin-unlock]", error);
    return NextResponse.json({ ok: false, error: "Erro ao liberar" }, { status: 500 });
  }
}
