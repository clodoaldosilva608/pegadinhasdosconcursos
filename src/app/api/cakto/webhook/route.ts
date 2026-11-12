// Webhook da Cakto — liberação automática ao confirmar o pagamento
// + captura de abandono de checkout (recuperação de venda).
//
// Configuração no painel Cakto (Integrações > Webhooks):
//   URL: https://pegadinhasdosconcursos.vercel.app/api/cakto/webhook
//   Eventos: purchase_approved, subscription_renewed, refund, chargeback,
//            subscription_canceled, checkout_abandonment
//   Chave Secreta: o mesmo valor do env CAKTO_WEBHOOK_SECRET
// A Cakto envia o secret dentro do payload ({secret, event, data}).

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import {
  normalizeEmail,
  planFromCaktoPayload,
  safeEqual,
  upsertApprovedPurchase,
  type AccessPlan,
} from "@/lib/access";

export const dynamic = "force-dynamic";

const APPROVED_EVENTS = new Set(["purchase_approved", "subscription_renewed"]);
const REVOKED_EVENTS = new Set(["refund", "chargeback", "subscription_canceled"]);
const ABANDONED_EVENTS = new Set(["checkout_abandonment"]);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { secret?: string; event?: string; data?: Record<string, unknown> }
    | null;

  const url = new URL(req.url);
  const providedSecret = String(body?.secret ?? url.searchParams.get("token") ?? "");
  const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET ?? "";

  if (!expectedSecret || !providedSecret || !safeEqual(providedSecret, expectedSecret)) {
    return NextResponse.json({ ok: false, error: "Secret inválido" }, { status: 401 });
  }

  const event = String(body?.event ?? "");
  const data = (body?.data ?? {}) as Record<string, unknown>;
  const customer = data.customer as { email?: string; phone?: string } | undefined;
  const email = normalizeEmail(String(customer?.email ?? ""));
  const refId = String((data.refId as string) ?? (data.id as string) ?? "") || null;
  const amountRaw = Number(data.amount);
  const amountCents = Number.isFinite(amountRaw) && amountRaw > 0 ? Math.round(amountRaw * 100) : null;
  const paidAtRaw = typeof data.paidAt === "string" ? data.paidAt : null;
  const paidAtMs = paidAtRaw ? new Date(paidAtRaw).getTime() : NaN;

  if (!email) {
    // Evento sem e-mail (ex.: pix_gerado de outro produto) — nada a fazer.
    console.log("[cakto-webhook] evento sem e-mail:", event);
    return NextResponse.json({ ok: true, skipped: "sem e-mail" });
  }

  const plan: AccessPlan = planFromCaktoPayload(data);

  try {
    const db = await dbReady();

    if (ABANDONED_EVENTS.has(event)) {
      // Cliente preencheu o checkout e não pagou: alimenta a aba "Recuperação"
      // do painel (WhatsApp/e-mail em 1 clique).
      const phone = String(customer?.phone ?? "").replace(/\D/g, "").slice(0, 13) || null;
      await db.abandonedCheckout.upsert({
        where: { email_plan: { email, plan } },
        update: { phone: phone ?? undefined, lastEventAt: new Date(), recoveredAt: null },
        create: {
          email,
          plan,
          phone,
          productRef: refId,
          lastEventAt: new Date(),
        },
      });
      console.log("[cakto-webhook] abandono registrado:", email, plan, event);
    } else if (APPROVED_EVENTS.has(event)) {
      await upsertApprovedPurchase({
        email,
        plan,
        refId,
        amountCents,
        paidAtMs: Number.isFinite(paidAtMs) ? paidAtMs : null,
      });
      // Compra aprovada: qualquer abandono pendente deste e-mail vira "recuperado".
      await db.abandonedCheckout.updateMany({
        where: { email, recoveredAt: null },
        data: { recoveredAt: new Date() },
      });
      console.log("[cakto-webhook] acesso liberado:", email, plan, event);
    } else if (REVOKED_EVENTS.has(event)) {
      // Reembolso/chargeback/cancelamento revoga o acesso do e-mail:
      // registra/atualiza a compra como refunded (o gating consulta isso).
      await db.purchase.updateMany({ where: { email }, data: { status: "refunded" } });
      await db.purchase.upsert({
        where: { email_plan: { email, plan } },
        update: { status: "refunded", refId, amountCents },
        create: {
          email,
          plan,
          status: "refunded",
          provider: "cakto",
          refId,
          amountCents,
        },
      });
      console.log("[cakto-webhook] acesso revogado:", email, event);
    } else {
      console.log("[cakto-webhook] evento informativo ignorado:", event, email);
    }
  } catch (error) {
    console.error("[cakto-webhook] erro ao processar:", error);
    // 200 mesmo assim para a Cakto não reenviar indefinidamente;
    // a verificação por e-mail com consulta ao vivo cobre o usuário depois.
  }

  return NextResponse.json({ ok: true });
}
