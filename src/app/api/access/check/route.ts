// Valida o token de acesso guardado no aparelho (assinatura + validade).

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const payload = verifyAccessToken(req.headers.get("x-access-token"));
  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    email: payload.email,
    plan: payload.plan,
    expiresAt: new Date(payload.exp).toISOString(),
  });
}
