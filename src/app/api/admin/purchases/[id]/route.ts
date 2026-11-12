// PATCH  /api/admin/purchases/[id] — edição completa da conta do usuário:
//        status (approved|refunded), PLANO (lifetime|pass30), e-mail e valor.
//        Trocar plano/e-mail mescla em (email, plan) — chave única da tabela.
// DELETE /api/admin/purchases/[id] — exclui o registro da conta.
//        (Para BLOQUEAR o acesso, use PATCH com status refunded — isso nega
//        os tokens do e-mail; excluir só remove o registro do banco.)

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";
import { isEmail, normalizeEmail } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { status?: string; plan?: string; email?: string; amountCents?: number }
    | null;

  const status =
    body?.status === "refunded" ? "refunded" : body?.status === "approved" ? "approved" : null;
  const plan = body?.plan === "lifetime" || body?.plan === "pass30" ? body.plan : null;
  const email = body?.email !== undefined ? normalizeEmail(String(body.email)) : null;
  const amountCents =
    body?.amountCents === undefined || body?.amountCents === null
      ? undefined
      : Math.max(0, Math.round(Number(body.amountCents) || 0));

  if (email !== null && !isEmail(email)) {
    return NextResponse.json({ ok: false, message: "E-mail inválido." }, { status: 400 });
  }
  if (status === null && plan === null && email === null && amountCents === undefined) {
    return NextResponse.json(
      { ok: false, message: "Nada para atualizar (status, plano, e-mail ou valor)." },
      { status: 400 }
    );
  }

  try {
    const db = await dbReady();
    const current = await db.purchase.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ ok: false, message: "Conta não encontrada" }, { status: 404 });
    }

    const nextEmail = email ?? current.email;
    const nextPlan = plan ?? current.plan;
    const nextStatus = status ?? current.status;
    const nextAmount = amountCents !== undefined ? amountCents : current.amountCents;

    // Troca de identidade/plano: preserva uma única linha por (email, plan).
    if (nextEmail !== current.email || nextPlan !== current.plan) {
      const target = await db.purchase.findUnique({
        where: { email_plan: { email: nextEmail, plan: nextPlan } },
      });
      const data = {
        status: nextStatus,
        amountCents: nextAmount,
        refId: current.refId,
      };
      if (target && target.id !== current.id) {
        const merged = await db.purchase.update({ where: { id: target.id }, data });
        await db.purchase.delete({ where: { id: current.id } });
        return NextResponse.json({
          ok: true,
          purchase: merged,
          message: "Conta atualizada (registros mesclados).",
        });
      }
      const updated = await db.purchase.update({
        where: { id },
        data: { email: nextEmail, plan: nextPlan, ...data },
      });
      return NextResponse.json({ ok: true, purchase: updated });
    }

    const updated = await db.purchase.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(amountCents !== undefined ? { amountCents } : {}),
      },
    });
    return NextResponse.json({ ok: true, purchase: updated });
  } catch (error) {
    console.error("[admin/purchases PATCH]", error);
    return NextResponse.json({ ok: false, message: "Erro ao atualizar conta" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const db = await dbReady();
    await db.purchase.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/purchases DELETE]", error);
    return NextResponse.json({ ok: false, message: "Conta não encontrada" }, { status: 404 });
  }
}
