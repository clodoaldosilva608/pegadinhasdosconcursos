// Estado do lançamento gratuito, calculado com o relógio do servidor a partir
// da configuração do site (editável no painel /admin → Site): janela grátis
// (ativação + data), cronômetro e interruptor do paywall. O frontend usa esta
// rota para decidir entre acesso livre e paywall, sem confiar no relógio do
// aparelho do usuário.

import { NextResponse } from "next/server";
import { cfgBool, getSiteConfig, launchState } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const values = await getSiteConfig();
  const launch = launchState(values);
  return NextResponse.json({
    launchFree: launch.free,
    freeUntil: launch.untilIso,
    freeUntilLabel: launch.untilLabel,
    countdownEnabled: cfgBool(values, "launch_countdown_enabled"),
    paywallEnabled: cfgBool(values, "paywall_enabled"),
    recoveryBannerEnabled: cfgBool(values, "recovery_banner_enabled"),
    serverNow: new Date().toISOString(),
  });
}
