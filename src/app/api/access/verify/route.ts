// Verificação de compra por e-mail: "Já paguei, liberar acesso".
// 1. Procura compra aprovada no banco (registrada pelo webhook da Cakto).
// 2. Se não achar, consulta ao vivo a API de pedidos da Cakto (se houver
//    CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET configurados) e registra a compra.
// 3. Emite token assinado (HMAC) que destrava o app no aparelho.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import {
  caktoPaidOrders,
  clientIp,
  getAccessSecret,
  isEmail,
  normalizeEmail,
  planExpiry,
  rateLimitHit,
  signAccessToken,
  upsertApprovedPurchase,
  type AccessPlan,
  type AccessPayload,
} from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (rateLimitHit(clientIp(req))) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited", message: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  if (!getAccessSecret()) {
    return NextResponse.json(
      { ok: false, reason: "server_config", message: "Servidor em configuração. Tente em instantes." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(String(body?.email ?? ""));
  if (!isEmail(email)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_email", message: "Digite um e-mail válido — o mesmo que usou na compra." },
      { status: 400 }
    );
  }

  try {
    const db = await dbReady();
    let purchases = await db.purchase.findMany({
      where: { email, status: "approved" },
      orderBy: { createdAt: "desc" },
    });

    if (purchases.length === 0) {
      // Fallback: consulta ao vivo na Cakto (cobre webhook perdido/atrasado).
      try {
        const orders = await caktoPaidOrders(email);
        for (const order of orders) {
          await upsertApprovedPurchase({
            email,
            plan: order.plan,
            refId: order.refId,
            amountCents: order.amountCents,
            paidAtMs: order.paidAtMs,
          });
        }
        if (orders.length > 0) {
          purchases = await db.purchase.findMany({
            where: { email, status: "approved" },
            orderBy: { createdAt: "desc" },
          });
        }
      } catch (error) {
        console.error("[access/verify] consulta ao vivo Cakto falhou:", error);
      }
    }

    if (purchases.length === 0) {
      return NextResponse.json({
        ok: false,
        reason: "not_found",
        message:
          "Não encontrei pagamento aprovado para este e-mail. Se acabou de pagar, aguarde cerca de 1 minuto e tente de novo. Confira também se o e-mail é o mesmo da compra.",
      });
    }

    // Melhor plano disponível: vitalício vence; senão o mais recente.
    const lifetime = purchases.find((p) => p.plan === "lifetime");
    const chosen = lifetime ?? purchases[0];
    const plan = chosen.plan as AccessPlan;
    const baseMs = chosen.createdAt ? new Date(chosen.createdAt).getTime() : Date.now();
    const exp = planExpiry(plan, baseMs);

    if (exp <= Date.now()) {
      return NextResponse.json({
        ok: false,
        reason: "expired",
        message: "Seu Passe de 30 dias expirou. Renove por R$ 9,90 para continuar.",
      });
    }

    const payload: AccessPayload = { email, plan, exp };
    const token = signAccessToken(payload);
    if (!token) {
      return NextResponse.json(
        { ok: false, reason: "server_config", message: "Servidor em configuração. Tente em instantes." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      token,
      plan,
      email,
      expiresAt: new Date(exp).toISOString(),
    });
  } catch (error) {
    console.error("[access/verify]", error);
    return NextResponse.json(
      { ok: false, reason: "server_error", message: "Erro ao verificar. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
