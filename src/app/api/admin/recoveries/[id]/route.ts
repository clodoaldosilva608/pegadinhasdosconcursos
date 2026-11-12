// PATCH /api/admin/recoveries/[id] — marca como recuperado/pendente ou edita o WhatsApp.
// DELETE — remove o registro.

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { recovered?: boolean; phone?: string }
    | null;

  try {
    const db = await dbReady();
    const data: { recoveredAt?: Date | null; phone?: string | null } = {};
    if (typeof body?.recovered === "boolean") {
      data.recoveredAt = body.recovered ? new Date() : null;
    }
    if (typeof body?.phone === "string") {
      data.phone = body.phone.replace(/\D/g, "").slice(0, 13) || null;
    }
    const item = await db.abandonedCheckout.update({ where: { id }, data });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("[admin/recoveries PATCH]", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao atualizar o abandono." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const db = await dbReady();
    await db.abandonedCheckout.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/recoveries DELETE]", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao remover o abandono." },
      { status: 500 }
    );
  }
}
