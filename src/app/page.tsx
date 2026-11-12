import { Landing } from "@/components/landing/Landing";
import { getSiteConfig, launchState, publicSiteConfig } from "@/lib/siteConfig";

// Dinâmico: a landing reflete imediatamente o que o dono altera no painel
// (/admin → Site) — textos, seções, preços e janela de lançamento.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const values = await getSiteConfig();
  const launch = launchState(values);
  return (
    <Landing
      cfg={publicSiteConfig(values)}
      launchFree={launch.free}
      freeUntilIso={launch.untilIso}
    />
  );
}
