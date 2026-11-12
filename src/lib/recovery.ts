// Mecanismo de recuperação de venda (anti-abandono + reativação).
//
// Camada 1 (in-app): quando o visitante clica em "Pagar com Pix" e volta sem
// finalizar, gravamos a intenção no aparelho (localStorage) e um banner mostra
// o que ele ganha ao concluir vs. o que arrisca ao ficar de fora.
//
// Camada 2 (painel): o evento checkout_abandonment da Cakto alimenta a aba
// "Recuperação" do admin, com mensagens prontas em 1 clique (WhatsApp/e-mail).
//
// Este arquivo é seguro para cliente: usa apenas libs compartilhadas.

import { appUrl } from "@/lib/share";
import { getPlans, type PlanId } from "@/lib/plans";

export type { PlanId };

/** Validação de e-mail (client-safe; duplicada de access.ts sem depender do servidor). */
export function isEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw);
}

const INTENT_KEY = "dp_checkout_intent";
const DISMISS_KEY = "dp_recovery_dismissed_at";
const INTENT_TTL_MS = 30 * 24 * 3600 * 1000; // intenção expira em 30 dias
const DISMISS_TTL_MS = 7 * 24 * 3600 * 1000; // "agora não" silencia por 7 dias

export interface CheckoutIntent {
  plan: PlanId;
  ts: number;
}

/** Chamado no clique de "Pagar com Pix" (antes do redirect ao checkout). */
export function markCheckoutIntent(plan: PlanId): void {
  try {
    localStorage.setItem(INTENT_KEY, JSON.stringify({ plan, ts: Date.now() }));
  } catch {
    /* storage indisponível */
  }
}

export function getCheckoutIntent(): CheckoutIntent | null {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutIntent>;
    if (parsed?.plan !== "lifetime" && parsed?.plan !== "pass30") return null;
    if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > INTENT_TTL_MS) return null;
    return { plan: parsed.plan, ts: parsed.ts };
  } catch {
    return null;
  }
}

export function clearCheckoutIntent(): void {
  try {
    localStorage.removeItem(INTENT_KEY);
  } catch {
    /* noop */
  }
}

/** "Agora não": esconde o banner por 7 dias. */
export function dismissRecovery(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function isRecoveryDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/** Link de checkout do plano (env público embutido no bundle do cliente). */
export function checkoutUrlFor(plan: PlanId): string | null {
  const plans = getPlans();
  return plans.find((p) => p.id === plan)?.checkout ?? null;
}

export function planName(plan: PlanId): string {
  return plan === "lifetime" ? "Acesso Vitalício" : "Passe 30 dias";
}

// ===== Copy: o que ganha vs. o que perde =====

export const RECOVERY_GAINS: string[] = [
  "Método 3C por letra: você descobre o porquê de cada alternativa",
  "Guia dos distratores que a Cebraspe mais usa (Meia-Verdade, Generalização…)",
  "Treino de vocabulário-armadilha para desconfiar dos operadores na hora da prova",
  "Liberação automática após o Pix — começa a usar em minutos",
  "Garantia legal de 7 dias (CDC, art. 49): não serviu, reembolso",
];

export const RECOVERY_LOSSES: string[] = [
  "1 pegadinha pode ser a diferença entre a aprovação e a lista de espera",
  "Meses de estudo desperdiçados por errar o que você realmente sabia",
  "Seus concorrentes treinando contra os truques da banca — e você não",
  "Quanto antes entrar, mais questões analisadas antes do dia da prova",
];

// ===== Mensagens prontas (painel admin: WhatsApp / e-mail em 1 clique) =====

export function recoveryMessage(plan: PlanId, name?: string): string {
  const url = checkoutUrlFor(plan) ?? appUrl();
  const gains = RECOVERY_GAINS.slice(0, 3).map((g) => `• ${g}`).join("\n");
  const losses = RECOVERY_LOSSES.slice(0, 2).map((l) => `• ${l}`).join("\n");
  return [
    name ? `${name}, tudo bem?` : "Olá, tudo bem?",
    "",
    `Vi que você escolheu o ${planName(plan)} do Detector de Pegadinhas, mas o Pix não foi finalizado — e separei seu acesso para não perder o preço de lançamento.`,
    "",
    "O que você leva:",
    gains,
    "",
    "O risco de ficar de fora:",
    losses,
    "",
    `Finalizar agora leva 1 minuto: ${url}`,
    "",
    "Lembrete: garantia de 7 dias por lei (CDC, art. 49). Qualquer dúvida, me responde por aqui!",
  ].join("\n");
}

export function recoverySubject(plan: PlanId): string {
  return `Falta só o Pix: seu ${planName(plan)} do Detector está separado`;
}

function withDdi(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function waRecoveryLink(phone: string, plan: PlanId, name?: string): string {
  return `https://wa.me/${withDdi(phone)}?text=${encodeURIComponent(recoveryMessage(plan, name))}`;
}

export function mailtoRecoveryLink(email: string, plan: PlanId, name?: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(recoverySubject(plan))}&body=${encodeURIComponent(recoveryMessage(plan, name))}`;
}
