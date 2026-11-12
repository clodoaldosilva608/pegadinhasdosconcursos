// Recuperação de venda (abandono de checkout) — painel admin.
// GET /api/admin/recoveries — lista (pendentes primeiro, depois por data)

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  try {
    const db = await dbReady();
    const items = await db.abandonedCheckout.findMany({
      orderBy: [{ recoveredAt: "asc" }, { lastEventAt: "desc" }],
      take: 200,
    });
    const pending = items.filter((item) => !item.recoveredAt).length;
    return NextResponse.json({ ok: true, items, total: items.length, pending });
  } catch (error) {
    console.error("[admin/recoveries GET]", error);
    return NextResponse.json({ ok: false, message: "Erro ao listar abandonos." }, { status: 500 });
  }
}
