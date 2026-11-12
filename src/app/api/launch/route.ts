// Estado do lançamento gratuito, calculado com o relógio do servidor a partir
// da configuração do site (editável no painel /admin → Site): janela grátis
// (ativação + data), cronômetro e interruptor do paywall. O frontend usa esta
// rota para decidir entre acesso livre e paywall, sem confiar no relógio do
// aparelho do usuário.
//
// Task 18: também expõe o estado da temporada natalina (contagem temática,
// selo/botão de presente), a neve em toda a página e o banner parceiro — tudo
// decidido no servidor para funcionar igual na landing e no app.

import { NextResponse } from "next/server";
import {
  cfgBool,
  getSiteConfig,
  launchState,
  isFestiveSeason,
  partnerConfig,
  snowfallActive,
} from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const values = await getSiteConfig();
  const launch = launchState(values);
  const festive = isFestiveSeason(values);
  const partner = partnerConfig(values);
  return NextResponse.json({
    launchFree: launch.free,
    freeUntil: launch.untilIso,
    freeUntilLabel: launch.untilLabel,
    countdownEnabled: cfgBool(values, "launch_countdown_enabled"),
    paywallEnabled: cfgBool(values, "paywall_enabled"),
    recoveryBannerEnabled: cfgBool(values, "recovery_banner_enabled"),
    // Task 18 — Natal + parceira
    christmasSeason: festive,
    snowfallActive: snowfallActive(values),
    partner: {
      enabled: partner.enabled,
      url: partner.url,
      label: partner.label,
      title: partner.title,
      text: partner.text,
      logo: partner.logo,
      cta: partner.cta,
    },
    serverNow: new Date().toISOString(),
  });
}
