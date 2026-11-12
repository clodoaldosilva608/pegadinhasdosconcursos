// GET /api/admin/overview — KPIs do painel (leads, compras, receita, contas).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  try {
    const db = await dbReady();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const [leadsTotal, leads7d, approved, refunded, revenue, accounts, analyses, recentLeads, recentPurchases, supportTotal, supportUnread] =
      await Promise.all([
        db.lead.count(),
        db.lead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        db.purchase.count({ where: { status: "approved" } }),
        db.purchase.count({ where: { status: "refunded" } }),
        db.purchase.aggregate({ _sum: { amountCents: true }, where: { status: "approved" } }),
        db.account.count(),
        db.analysis.count(),
        db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        db.purchase.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        db.supportMessage.count(),
        db.supportMessage.count({ where: { status: "new" } }),
      ]);

    return NextResponse.json({
      ok: true,
      leads: { total: leadsTotal, last7days: leads7d },
      purchases: {
        approved,
        refunded,
        revenueCents: revenue._sum.amountCents ?? 0,
      },
      accounts,
      analyses,
      support: { total: supportTotal, unread: supportUnread },
      recentLeads,
      recentPurchases,
    });
  } catch (error) {
    console.error("[admin/overview]", error);
    return NextResponse.json({ ok: false, error: "Erro ao carregar visão geral" }, { status: 500 });
  }
}
