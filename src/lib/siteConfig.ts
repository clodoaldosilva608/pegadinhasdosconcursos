// Configuração central do site — editável pelo painel admin (/admin → aba Site).
// Padrões vivem aqui; o que estiver na tabela "SiteConfig" sobrescreve.
//
// Importante: support_email/support_whatsapp/paywall_enabled são SENSÍVEIS
// (não podem ir para o cliente). Use publicSiteConfig() para montar as props
// da landing — o e-mail de suporte nunca é renderizado na página; ele só é
// entregue sob demanda por GET /api/support/contact.

import { dbReady } from "@/lib/db";
import { LAUNCH_FREE_UNTIL_ISO, LAUNCH_DEADLINE_LABEL } from "@/lib/launch";

export const SITE_DEFAULTS: Record<string, string> = {
  // Lançamento & acesso
  launch_free_enabled: "1",
  launch_free_until: LAUNCH_FREE_UNTIL_ISO,
  launch_countdown_enabled: "1",
  launch_badge: `Lançamento · 100% grátis até ${LAUNCH_DEADLINE_LABEL}`,
  // Decoração natalina da faixa de lançamento (pisca-pisca, neve, Papai Noel)
  launch_christmas_enabled: "1",
  paywall_enabled: "1",
  // Textos da página inicial
  hero_title: "A pegadinha que a banca preparou, decifrada antes da prova",
  hero_subtitle:
    "Você manda a questão, confirma o que marcou — e o Detector mostra o distrator que quase te pegou, o operador semântico da pegadinha e o porquê de cada alternativa. Instale no celular e estude com o Método 3C: Conteúdo, Cauda e Contexto por letra.",
  hero_bullets:
    "Abre como aplicativo, direto da tela inicial|Você usa a sua própria chave de IA (grátis)|Análise da questão em segundos",
  // Seções visíveis (1 = aparece, 0 = oculta)
  section_features: "1",
  section_steps: "1",
  section_leads: "1",
  section_plans: "1",
  section_faq: "1",
  section_share: "1",
  // Seção de compartilhamento (divulgação)
  share_title: "Ajude um amigo a não cair na pegadinha",
  share_subtitle:
    "Quem estuda junto passa junto. Compartilhe o Detector com quem também está na batalha do concurso — um convite seu pode salvar meses de estudo de alguém.",
  // Recuperação de venda (banner anti-abandono para quem clicou e não pagou)
  recovery_banner_enabled: "1",
  // Seção de avisos (funil)
  leads_title: "Receba novidades e ofertas em primeira mão",
  leads_subtitle:
    "Cupons, novos blocos de vocabulário e avisos do lançamento — direto no seu e-mail ou WhatsApp. Sem spam: você autoriza e pode sair quando quiser.",
  // Planos (exibição)
  plans_pass30_price: "R$ 9,90",
  plans_lifetime_price: "R$ 29,90",
  plans_lifetime_anchor: "R$ 49,90",
  // Suporte (NUNCA exibido na landing; usado pela API sob demanda e pelo painel)
  support_email: "clodoaldosilva608@gmail.com",
  support_whatsapp: "",
  // Rodapé
  footer_note:
    "Produto independente de estudos, sem vínculo com bancas ou órgãos públicos. Pagamentos processados pela Cakto. Coletamos o e-mail da compra e, com o seu consentimento, e-mail/WhatsApp para avisos e ofertas (você pode pedir remoção a qualquer momento — LGPD).",
};

export type SiteConfigValues = Record<string, string>;

/** Chaves que podem ser enviadas ao cliente (landing). Exclui as sensíveis. */
const PUBLIC_KEYS = [
  "launch_countdown_enabled",
  "launch_badge",
  "launch_christmas_enabled",
  "hero_title",
  "hero_subtitle",
  "hero_bullets",
  "section_features",
  "section_steps",
  "section_leads",
  "section_plans",
  "section_faq",
  "section_share",
  "share_title",
  "share_subtitle",
  "recovery_banner_enabled",
  "leads_title",
  "leads_subtitle",
  "plans_pass30_price",
  "plans_lifetime_price",
  "plans_lifetime_anchor",
  "footer_note",
] as const;

export type PublicSiteConfig = Partial<Record<(typeof PUBLIC_KEYS)[number], string>> & {
  [key: string]: string | undefined;
};

/** Lê a configuração mesclando DB sobre os padrões (à prova de instância fria). */
export async function getSiteConfig(): Promise<SiteConfigValues> {
  const values: SiteConfigValues = { ...SITE_DEFAULTS };
  try {
    const db = await dbReady();
    const rows = await db.siteConfig.findMany();
    for (const row of rows) {
      if (row.key in SITE_DEFAULTS) values[row.key] = row.value;
    }
  } catch {
    // DB indisponível (instância fria/erro): usa os padrões do código.
  }
  return values;
}

/** Recorte seguro para props do cliente. */
export function publicSiteConfig(values: SiteConfigValues): PublicSiteConfig {
  const out: PublicSiteConfig = {};
  for (const key of PUBLIC_KEYS) out[key] = values[key] ?? SITE_DEFAULTS[key] ?? "";
  return out;
}

/** "1" (ou qualquer coisa diferente de "0") = ligado. */
export function cfgBool(values: SiteConfigValues, key: string): boolean {
  return (values[key] ?? SITE_DEFAULTS[key] ?? "0") !== "0";
}

export interface LaunchState {
  /** true = dentro da janela de lançamento gratuito (e ela está ativa). */
  free: boolean;
  untilIso: string;
  untilLabel: string;
}

/** Estado do lançamento a partir da configuração (decisão sempre no servidor). */
export function launchState(values: SiteConfigValues, now: number = Date.now()): LaunchState {
  const enabled = cfgBool(values, "launch_free_enabled");
  const untilMs = new Date(values.launch_free_until).getTime();
  const free = enabled && Number.isFinite(untilMs) && now < untilMs;
  const untilLabel = Number.isFinite(untilMs)
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        new Date(untilMs)
      )
    : LAUNCH_DEADLINE_LABEL;
  return { free, untilIso: values.launch_free_until, untilLabel };
}

/** Usado pelo painel: devolve apenas as chaves conhecidas (whitelist). */
export function isKnownConfigKey(key: string): boolean {
  return key in SITE_DEFAULTS;
}
