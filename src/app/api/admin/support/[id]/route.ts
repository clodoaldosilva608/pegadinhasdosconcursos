// PATCH  /api/admin/support/[id] — marcar como lida/respondida/nova
// DELETE /api/admin/support/[id] — excluir mensagem (LGPD/dados sensíveis)

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["new", "read", "replied"]);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status ?? "";
  if (!STATUSES.has(status)) {
    return NextResponse.json(
      { ok: false, message: "status deve ser new, read ou replied" },
      { status: 400 }
    );
  }

  try {
    const db = await dbReady();
    const message = await db.supportMessage.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    console.error("[admin/support PATCH]", error);
    return NextResponse.json({ ok: false, message: "Mensagem não encontrada" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const db = await dbReady();
    await db.supportMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/support DELETE]", error);
    return NextResponse.json({ ok: false, message: "Mensagem não encontrada" }, { status: 404 });
  }
}
