// GET /api/auth/session — estado da sessão do usuário para a página /entrar.
// Devolve e-mail/nome e, quando o e-mail tem compra aprovada, o token de
// acesso pago (mesmo formato do /api/access/verify) — a UI mostra o plano
// ativo e permite ir direto para a plataforma.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import {
  accessForClient,
  bestPurchaseAccess,
  sessionEmail,
} from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = sessionEmail(req);
  if (!email) {
    return NextResponse.json({ ok: true, loggedIn: false });
  }
  try {
    const user = await (await dbReady()).authUser.findUnique({
      where: { email },
      select: { email: true, name: true },
    });
    if (!user) {
      // Conta removida após o cookie emitir: sessão órfã.
      return NextResponse.json({ ok: true, loggedIn: false });
    }
    const accessPayload = await bestPurchaseAccess(email);
    const access = accessPayload ? accessForClient(accessPayload) : null;
    return NextResponse.json({ ok: true, loggedIn: true, email: user.email, name: user.name, access });
  } catch (error) {
    console.error("[auth/session]", error);
    // Banco indisponível: sessão válida pelo cookie, sem detalhes de compra.
    return NextResponse.json({ ok: true, loggedIn: true, email });
  }
}
