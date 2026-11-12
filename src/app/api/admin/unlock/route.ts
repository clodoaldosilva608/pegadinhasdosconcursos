// POST /api/admin/unlock — liberação manual de acesso por e-mail + plano
// (mesma lógica do /api/access/admin-unlock, porém autenticada pelo cookie
// do painel — o navegador do admin não conhece o ADMIN_SECRET).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import {
  getAccessSecret,
  isEmail,
  normalizeEmail,
  planExpiry,
  signAccessToken,
  upsertApprovedPurchase,
  type AccessPlan,
} from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { email?: string; plan?: string } | null;
  const email = normalizeEmail(String(body?.email ?? ""));
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, message: "E-mail inválido." }, { status: 400 });
  }

  const plan: AccessPlan = body?.plan === "pass30" ? "pass30" : "lifetime";
  if (!getAccessSecret()) {
    return NextResponse.json({ ok: false, message: "Servidor em configuração." }, { status: 503 });
  }

  try {
    await upsertApprovedPurchase({ email, plan, refId: "admin-painel" });
    const exp = planExpiry(plan, Date.now());
    const token = signAccessToken({ email, plan, exp });
    return NextResponse.json({
      ok: true,
      email,
      plan,
      token,
      expiresAt: new Date(exp).toISOString(),
      message: `Acesso ${plan === "lifetime" ? "vitalício" : "Passe 30 dias"} liberado para ${email}.`,
    });
  } catch (error) {
    console.error("[admin/unlock]", error);
    return NextResponse.json({ ok: false, error: "Erro ao liberar acesso" }, { status: 500 });
  }
}
