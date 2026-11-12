// POST /api/auth/logout — encerra a sessão do usuário (limpa o cookie).

import { NextResponse } from "next/server";
import { clearUserCookie } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  return clearUserCookie(NextResponse.json({ ok: true }));
}
