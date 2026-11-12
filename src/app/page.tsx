import { Landing } from "@/components/landing/Landing";
import {
  getSiteConfig,
  isFestiveSeason,
  launchState,
  partnerConfig,
  publicSiteConfig,
  snowfallActive,
} from "@/lib/siteConfig";

// Dinâmico: a landing reflete imediatamente o que o dono altera no painel
// (/admin → Site) — textos, seções, preços, janela de lançamento, Natal e
// banner parceiro. Decisões de temporada/neve sempre no servidor.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const values = await getSiteConfig();
  const launch = launchState(values);
  return (
    <Landing
      cfg={publicSiteConfig(values)}
      launchFree={launch.free}
      freeUntilIso={launch.untilIso}
      festive={isFestiveSeason(values)}
      snowActive={snowfallActive(values)}
      partner={partnerConfig(values)}
    />
  );
}
