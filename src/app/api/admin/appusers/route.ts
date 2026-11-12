// Usuários do app (Task 18) — painel admin.
// GET /api/admin/appusers?q=&page=&pageSize= — aparelhos que abriram o /app,
// ordenados pela última visita (mais recente primeiro).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20") || 20));

  const where = q
    ? {
        OR: [{ email: { contains: q } }, { deviceId: { contains: q } }, { userAgent: { contains: q } }],
      }
    : {};

  try {
    const db = await dbReady();
    const [items, total] = await Promise.all([
      db.appUser.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.appUser.count({ where }),
    ]);
    return NextResponse.json({ ok: true, items, total, page, pageSize });
  } catch (error) {
    console.error("[admin/appusers GET]", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar usuários do app" }, { status: 500 });
  }
}
