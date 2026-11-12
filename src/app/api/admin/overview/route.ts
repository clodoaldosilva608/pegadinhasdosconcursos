// GET /api/admin/overview — KPIs do painel (leads, compras, receita, contas,
// usuários do app) + aviso de banco temporário (SQLite em /tmp na Vercel).

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

    const [leadsTotal, leads7d, approved, refunded, revenue, accounts, analyses, recentLeads, recentPurchases, supportTotal, supportUnread, appUsersTotal, appUsers7d] =
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
        db.appUser.count(),
        db.appUser.count({ where: { firstSeenAt: { gte: sevenDaysAgo } } }),
      ]);

    // Banco temporário: na Vercel o SQLite vive em /tmp e nasce vazio a cada
    // instância fria — o painel avisa o dono para não achar que "perdeu" dados.
    const databaseUrl = process.env.DATABASE_URL ?? "";
    const dbEphemeral = process.env.VERCEL === "1" && databaseUrl.includes("/tmp");

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
      appUsers: { total: appUsersTotal, last7days: appUsers7d },
      dbEphemeral,
      recentLeads,
      recentPurchases,
    });
  } catch (error) {
    console.error("[admin/overview]", error);
    return NextResponse.json({ ok: false, error: "Erro ao carregar visão geral" }, { status: 500 });
  }
}
