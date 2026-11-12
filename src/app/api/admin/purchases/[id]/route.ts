// PATCH /api/admin/purchases/[id] — aprovar/revogar uma compra
// (revogar = refunded → os próximos requests com token desse e-mail são negados).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status === "refunded" ? "refunded" : body?.status === "approved" ? "approved" : null;
  if (!status) {
    return NextResponse.json({ ok: false, message: "status deve ser approved ou refunded" }, { status: 400 });
  }

  try {
    const db = await dbReady();
    const purchase = await db.purchase.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true, purchase });
  } catch (error) {
    console.error("[admin/purchases PATCH]", error);
    return NextResponse.json({ ok: false, error: "Compra não encontrada" }, { status: 404 });
  }
}
