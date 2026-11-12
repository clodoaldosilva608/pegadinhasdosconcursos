// POST /api/auth/login — entra com e-mail + senha.
// - Mensagem única para e-mail inexistente/senha errada (sem enumeration).
// - Atualiza lastLoginAt e devolve a sessão (cookie assinado, 30 dias).
// - Se o e-mail tem compra aprovada (Purchase), devolve o MESMO token de
//   acesso pago — a conta restaura o acesso comprado em qualquer aparelho.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import { clientIp, isEmail, normalizeEmail, rateLimitHit } from "@/lib/access";
import {
  accessForClient,
  bestPurchaseAccess,
  verifyPassword,
  withUserCookie,
} from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (rateLimitHit(`auth-login:${clientIp(req)}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");

  if (!isEmail(email) || !password) {
    return NextResponse.json(
      { ok: false, message: "Informe e-mail e senha." },
      { status: 400 }
    );
  }

  try {
    const db = await dbReady();
    const user = await db.authUser.findUnique({
      where: { email },
      select: { email: true, name: true, passwordHash: true },
    });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { ok: false, message: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    await db.authUser.update({
      where: { email },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    });

    const accessPayload = await bestPurchaseAccess(email);
    const access = accessPayload ? accessForClient(accessPayload) : null;
    return withUserCookie(
      NextResponse.json({ ok: true, email: user.email, name: user.name, access }),
      email
    );
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao entrar. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
