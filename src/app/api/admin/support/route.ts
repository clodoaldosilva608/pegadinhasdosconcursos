// GET /api/admin/support — caixa de entrada das mensagens do botão "Suporte".
// Filtros: q (e-mail/nome), status (new|read|replied), paginação.

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
    ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {}),
    ...(status ? { status } : {}),
  };

  try {
    const db = await dbReady();
    const [items, total, unread] = await Promise.all([
      db.supportMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.supportMessage.count({ where }),
      db.supportMessage.count({ where: { status: "new" } }),
    ]);
    return NextResponse.json({ ok: true, items, total, page, pageSize, unread });
  } catch (error) {
    console.error("[admin/support GET]", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar mensagens" }, { status: 500 });
  }
}
