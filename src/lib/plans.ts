// Planos do Detector de Pegadinhas.
// Os links de checkout vêm da Cakto e são configurados como variáveis de
// ambiente públicas (NEXT_PUBLIC_CAKTO_CHECKOUT_PASS30 / _LIFETIME).
// Enquanto não estiverem configurados, o botão mostra estado "em liberação".

export type PlanId = "pass30" | "lifetime";

export interface PlanInfo {
  id: PlanId;
  name: string;
  price: string;
  anchor?: string;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  checkout: string | null;
}

export const SUPPORT_EMAIL = "clodoaldosilva608@gmail.com";

export function getPlans(): PlanInfo[] {
  const pass30 = process.env.NEXT_PUBLIC_CAKTO_CHECKOUT_PASS30 || null;
  const lifetime = process.env.NEXT_PUBLIC_CAKTO_CHECKOUT_LIFETIME || null;

  return [
    {
      id: "pass30",
      name: "Passe 30 dias",
      price: "R$ 9,90",
      period: "pagamento único · 30 dias de acesso",
      tagline: "Ideal para conhecer o método sem compromisso.",
      features: [
        "Acesso completo por 30 dias",
        "Analisador de pegadinhas (Método 3C)",
        "Guia dos distratores que a banca mais usa",
        "Treino de vocabulário-armadilha",
      ],
      checkout: pass30,
    },
    {
      id: "lifetime",
      name: "Vitalício",
      price: "R$ 29,90",
      anchor: "R$ 49,90",
      period: "pagamento único · acesso permanente",
      tagline: "Paga uma vez e usa durante toda a sua jornada de concurso.",
      highlight: true,
      features: [
        "Tudo do Passe, sem prazo de validade",
        "Atualizações futuras incluídas",
        "Reembolso em até 7 dias (CDC, art. 49)",
        "Suporte por e-mail",
      ],
      checkout: lifetime,
    },
  ];
}

export const PLAN_LABELS: Record<string, string> = {
  pass30: "Passe 30 dias",
  lifetime: "Vitalício",
};
