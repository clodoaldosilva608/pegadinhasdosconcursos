// POST /api/admin/logout — limpa o cookie de sessão do painel.

import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  return clearAdminCookie(NextResponse.json({ ok: true }));
}
