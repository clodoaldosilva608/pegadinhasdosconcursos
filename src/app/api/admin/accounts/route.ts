// GET /api/admin/accounts — contas internas (limite de análises etc.)

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  try {
    const db = await dbReady();
    const items = await db.account.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("[admin/accounts GET]", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar contas" }, { status: 500 });
  }
}
