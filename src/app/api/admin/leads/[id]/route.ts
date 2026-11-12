// PATCH /api/admin/leads/[id] — edita; DELETE — remove (direito de saída LGPD).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { name?: string; whatsapp?: string; consent?: boolean; source?: string; notes?: string }
    | null;

  try {
    const db = await dbReady();
    const lead = await db.lead.update({
      where: { id },
      data: {
        name: typeof body?.name === "string" ? body.name.trim().slice(0, 120) : undefined,
        whatsapp:
          typeof body?.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "").slice(0, 13) : undefined,
        consent: typeof body?.consent === "boolean" ? body.consent : undefined,
        source: typeof body?.source === "string" ? body.source.slice(0, 20) : undefined,
        notes: typeof body?.notes === "string" ? body.notes.slice(0, 500) : undefined,
      },
    });
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    console.error("[admin/leads PATCH]", error);
    return NextResponse.json({ ok: false, error: "Lead não encontrado" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const db = await dbReady();
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/leads DELETE]", error);
    return NextResponse.json({ ok: false, error: "Lead não encontrado" }, { status: 404 });
  }
}
