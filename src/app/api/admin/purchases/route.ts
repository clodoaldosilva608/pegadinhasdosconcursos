// Compras (Cakto) — painel admin.
// GET /api/admin/purchases?q=&status=&page= — lista paginada

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const status = (searchParams.get("status") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20") || 20));

  const where = {
    ...(q ? { email: { contains: q } } : {}),
    ...(status ? { status } : {}),
  };

  try {
    const db = await dbReady();
    const [items, total] = await Promise.all([
      db.purchase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.purchase.count({ where }),
    ]);
    return NextResponse.json({ ok: true, items, total, page, pageSize });
  } catch (error) {
    console.error("[admin/purchases GET]", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar compras" }, { status: 500 });
  }
}
