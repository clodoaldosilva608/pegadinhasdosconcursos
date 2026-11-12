// GET /api/admin/leads/export — CSV pronto para ferramentas de e-mail/WhatsApp
// (com BOM para abrir corretamente no Excel brasileiro).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  try {
    const db = await dbReady();
    const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
    const header = ["email", "nome", "whatsapp", "consentimento", "origem", "criado_em", "notas"];
    const rows = leads.map((lead) =>
      [
        lead.email,
        lead.name ?? "",
        lead.whatsapp ?? "",
        lead.consent ? "sim" : "nao",
        lead.source,
        lead.createdAt.toISOString(),
        lead.notes ?? "",
      ]
        .map(csvCell)
        .join(";")
    );
    const csv = "\uFEFF" + [header.map(csvCell).join(";"), ...rows].join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-detector-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[admin/leads/export]", error);
    return NextResponse.json({ ok: false, error: "Erro ao exportar" }, { status: 500 });
  }
}
