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

    // Sequencial (nada de Promise.all): o pool do Supabase é connection_limit=1
    // e consultas paralelas estouram o timeout do pool (Task 21 +3 KPIs).
    const leadsTotal = await db.lead.count();
    const leads7d = await db.lead.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const approved = await db.purchase.count({ where: { status: "approved" } });
    const refunded = await db.purchase.count({ where: { status: "refunded" } });
    const revenue = await db.purchase.aggregate({ _sum: { amountCents: true }, where: { status: "approved" } });
    const accounts = await db.account.count();
    const analyses = await db.analysis.count();
    const recentLeads = await db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
    const recentPurchases = await db.purchase.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
    const supportTotal = await db.supportMessage.count();
    const supportUnread = await db.supportMessage.count({ where: { status: "new" } });
    const appUsersTotal = await db.appUser.count();
    const appUsers7d = await db.appUser.count({ where: { firstSeenAt: { gte: sevenDaysAgo } } });
    const authUsersTotal = await db.authUser.count();
    const authUsers7d = await db.authUser.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const authUsersConsent = await db.authUser.count({ where: { marketingConsent: true } });

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
      authUsers: { total: authUsersTotal, last7days: authUsers7d, withConsent: authUsersConsent },
      dbEphemeral,
      recentLeads,
      recentPurchases,
    });
  } catch (error) {
    console.error("[admin/overview]", error);
    return NextResponse.json({ ok: false, error: "Erro ao carregar visão geral" }, { status: 500 });
  }
}
