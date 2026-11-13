// Painel admin — seção Contas: lista as contas criadas em /entrar com plano
// (melhor compra aprovada), consentimento de marketing (LGPD) e nº de análises.
// GET /api/admin/authusers?q=&page=&pageSize=

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";
import { bestPurchasePlanMap } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20") || 20));

  const where = q
    ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
    : {};

  try {
    const db = await dbReady();
    const [items, total] = await Promise.all([
      db.authUser.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          marketingConsent: true,
          consentAt: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      db.authUser.count({ where }),
    ]);

    const emails = items.map((i) => i.email);
    const [plans, analysesCounts] = await Promise.all([
      bestPurchasePlanMap(emails),
      db.analysis.groupBy({
        by: ["email"],
        where: { email: { in: emails } },
        _count: { _all: true },
      }),
    ]);
    const analysesByEmail = new Map(
      analysesCounts.map((row) => [row.email, row._count._all])
    );

    return NextResponse.json({
      ok: true,
      items: items.map((i) => ({
        ...i,
        plan: plans.get(i.email)?.plan ?? null,
        planExpiresAt: plans.get(i.email)?.expiresAt ?? null,
        analysesCount: analysesByEmail.get(i.email) ?? 0,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[admin/authusers GET]", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar contas" }, { status: 500 });
  }
}
