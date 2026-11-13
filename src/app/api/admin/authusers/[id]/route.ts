// DELETE /api/admin/authusers/[id] — remove a conta do usuário (login/senha).
// A compra (Purchase) NÃO é apagada: registro financeiro — a revogação de
// acesso continua sendo feita na aba "Usuários & planos".

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const db = await dbReady();
    const existing = await db.authUser.findUnique({ where: { id }, select: { email: true } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Conta não encontrada" }, { status: 404 });
    }
    await db.authUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/authusers DELETE]", error);
    return NextResponse.json({ ok: false, error: "Erro ao excluir a conta" }, { status: 500 });
  }
}
