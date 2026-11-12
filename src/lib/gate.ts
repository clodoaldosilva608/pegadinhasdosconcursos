// Portão de acesso das rotas de IA conforme a configuração do site:
// - paywall_enabled = 0 → acesso livre (funcionalidade desligada pelo admin);
// - dentro da janela de lançamento gratuito → acesso livre;
// - caso contrário → exige token pago (requireAccess).

import { NextRequest, NextResponse } from "next/server";
import { cfgBool, getSiteConfig, launchState } from "@/lib/siteConfig";
import { requireAccess } from "@/lib/access";

export async function requireAccessBySiteConfig(
  req: NextRequest
): Promise<NextResponse | null> {
  const values = await getSiteConfig();
  const launch = launchState(values);
  if (!cfgBool(values, "paywall_enabled") || launch.free) return null;
  return requireAccess(req);
}
