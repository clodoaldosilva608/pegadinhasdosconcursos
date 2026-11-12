// PATCH /api/admin/appusers/[id] — corrige plano/e-mail do aparelho.
// DELETE /api/admin/appusers/[id] — remove o registro do aparelho (reabre
// como "novo usuário" na próxima visita, com novo deviceId do storage).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

const PLAN_VALUES = new Set(["free", "pass30", "lifetime"]);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { plan?: string; email?: string } | null;

  const planRaw = String(body?.plan ?? "").trim().toLowerCase();
  const emailRaw = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);

  try {
    const db = await dbReady();
    const user = await db.appUser.update({
      where: { id },
      data: {
        ...(PLAN_VALUES.has(planRaw) ? { plan: planRaw } : {}),
        ...(emailRaw ? { email: emailRaw } : emailRaw === "" ? { email: null } : {}),
      },
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("[admin/appusers PATCH]", error);
    return NextResponse.json({ ok: false, error: "Usuário do app não encontrado" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const db = await dbReady();
    await db.appUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/appusers DELETE]", error);
    return NextResponse.json({ ok: false, error: "Usuário do app não encontrado" }, { status: 404 });
  }
}
