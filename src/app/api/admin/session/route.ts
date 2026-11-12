// GET /api/admin/session — o painel usa para decidir entre login e conteúdo.

import { NextRequest, NextResponse } from "next/server";
import { adminDenied, adminEmail } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;
  return NextResponse.json({ ok: true, email: adminEmail() });
}
