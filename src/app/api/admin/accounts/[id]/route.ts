// PATCH /api/admin/accounts/[id] — ajusta plano/limite de análises.

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { planLabel?: string; analysesLeft?: number; noDeadline?: boolean }
    | null;

  const analysesLeft =
    body?.analysesLeft === undefined ? undefined : Math.max(0, Math.min(1_000_000, Number(body.analysesLeft) || 0));
  if (analysesLeft !== undefined && !Number.isFinite(analysesLeft)) {
    return NextResponse.json({ ok: false, message: "analysesLeft inválido" }, { status: 400 });
  }

  try {
    const db = await dbReady();
    const account = await db.account.update({
      where: { id },
      data: {
        planLabel: typeof body?.planLabel === "string" ? body.planLabel.slice(0, 80) : undefined,
        analysesLeft,
        noDeadline: typeof body?.noDeadline === "boolean" ? body.noDeadline : undefined,
      },
    });
    return NextResponse.json({ ok: true, account });
  } catch (error) {
    console.error("[admin/accounts PATCH]", error);
    return NextResponse.json({ ok: false, error: "Conta não encontrada" }, { status: 404 });
  }
}
