// POST /api/admin/login — { email, password } → cookie de sessão (8 h).

import { NextRequest, NextResponse } from "next/server";
import {
  adminEmail,
  checkCredentials,
  clearAdminCookie,
  createAdminToken,
  withAdminCookie,
} from "@/lib/adminAuth";
import { clientIp, rateLimitHit } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Anti-força-bruta simples: 8 tentativas / 10 min por IP.
  if (rateLimitHit(`admin-login:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde 10 minutos." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body || !checkCredentials(String(body.email ?? ""), String(body.password ?? ""))) {
    return clearAdminCookie(
      NextResponse.json({ ok: false, message: "E-mail ou senha incorretos." }, { status: 401 })
    );
  }

  return withAdminCookie(
    NextResponse.json({ ok: true, email: adminEmail() }),
    createAdminToken()
  );
}
