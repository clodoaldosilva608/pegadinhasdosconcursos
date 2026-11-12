// GET  /api/admin/settings — valores atuais do SiteConfig (mesclados com padrões)
// PUT  /api/admin/settings — salva chaves (whitelist) OU reseta (reset: true)
// Só admin (cookie dp-admin).

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";
import { getSiteConfig, isKnownConfigKey, SITE_DEFAULTS } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const values = await getSiteConfig();
  return NextResponse.json({ ok: true, values });
}

export async function PUT(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as
    | { values?: Record<string, unknown>; reset?: boolean }
    | null;

  try {
    const db = await dbReady();

    if (body?.reset) {
      await db.siteConfig.deleteMany({
        where: { key: { in: Object.keys(SITE_DEFAULTS) } },
      });
      const values = await getSiteConfig();
      return NextResponse.json({ ok: true, values, message: "Padrões restaurados." });
    }

    const incoming = body?.values ?? {};
    const keys = Object.keys(incoming).filter(isKnownConfigKey);
    for (const key of keys) {
      const value = String(incoming[key] ?? "").slice(0, 4000);
      await db.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    const values = await getSiteConfig();
    return NextResponse.json({
      ok: true,
      values,
      message: keys.length === 1 ? "Configuração salva." : `${keys.length} configurações salvas.`,
    });
  } catch (error) {
    console.error("[admin/settings PUT]", error);
    return NextResponse.json({ ok: false, message: "Erro ao salvar configurações." }, { status: 500 });
  }
}
