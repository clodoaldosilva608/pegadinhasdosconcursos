// POST /api/auth/register — cria a conta do usuário (nome?, e-mail, senha).
// - Senha ≥ 8 caracteres, hash scrypt no banco (nunca texto puro).
// - Rate limit anti-abuso por IP.
// - Se o e-mail já tem compra aprovada (Purchase), já devolve o token de
//   acesso pago — cadastro com e-mail de comprador libera a plataforma.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import { clientIp, isEmail, normalizeEmail, rateLimitHit } from "@/lib/access";
import {
  accessForClient,
  bestPurchaseAccess,
  hashPassword,
  withUserCookie,
} from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (rateLimitHit(`auth-register:${clientIp(req)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string }
    | null;
  const name = String(body?.name ?? "").trim().slice(0, 80) || null;
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");

  if (!isEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Digite um e-mail válido." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, message: "A senha precisa ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }
  if (password.length > 200) {
    return NextResponse.json(
      { ok: false, message: "Senha muito longa (máximo 200 caracteres)." },
      { status: 400 }
    );
  }

  try {
    const db = await dbReady();
    const existing = await db.authUser.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Já existe uma conta com este e-mail. Use a aba “Entrar”." },
        { status: 409 }
      );
    }
    const user = await db.authUser.create({
      data: { email, name, passwordHash: hashPassword(password), lastLoginAt: new Date() },
      select: { email: true, name: true },
    });

    const accessPayload = await bestPurchaseAccess(email);
    const access = accessPayload ? accessForClient(accessPayload) : null;
    return withUserCookie(
      NextResponse.json({ ok: true, email: user.email, name: user.name, access }),
      email
    );
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao criar a conta. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
