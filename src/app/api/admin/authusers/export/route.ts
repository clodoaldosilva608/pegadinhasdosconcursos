// GET /api/admin/authusers/export — CSV das contas para ferramentas de
// e-mail marketing (promoções/lançamentos), com BOM para o Excel brasileiro.
// Respeita ?consent=1 para exportar apenas quem autorizou mensagens (LGPD).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";
import { bestPurchasePlanMap } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const onlyConsent = new URL(req.url).searchParams.get("consent") === "1";

  try {
    const db = await dbReady();
    const users = await db.authUser.findMany({
      where: onlyConsent ? { marketingConsent: true } : {},
      orderBy: { createdAt: "desc" },
    });
    const plans = await bestPurchasePlanMap(users.map((u) => u.email));
    const analysesCounts = await db.analysis.groupBy({
      by: ["email"],
      where: { email: { in: users.map((u) => u.email) } },
      _count: { _all: true },
    });
    const analysesByEmail = new Map(analysesCounts.map((r) => [r.email, r._count._all]));

    const header = ["nome", "email", "consentimento_promo", "plano", "plano_ativo_ate", "analises", "conta_criada_em", "ultimo_login"];
    const rows = users.map((u) =>
      [
        u.name ?? "",
        u.email,
        u.marketingConsent ? "sim" : "nao",
        plans.get(u.email)?.plan ?? "free",
        plans.get(u.email)?.expiresAt ?? "",
        analysesByEmail.get(u.email) ?? 0,
        u.createdAt.toISOString(),
        u.lastLoginAt?.toISOString() ?? "",
      ]
        .map(csvCell)
        .join(";")
    );
    const csv = "\uFEFF" + [header.map(csvCell).join(";"), ...rows].join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contas-detector-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[admin/authusers/export]", error);
    return NextResponse.json({ ok: false, error: "Erro ao exportar" }, { status: 500 });
  }
}
