"use client";

// Seção de planos (Passe 30 dias / Vitalício) — usada na landing e no
// bloqueio de acesso. Checkout via Cakto (Pix), liberação automática.
// Preços podem ser sobrescritos pelo painel admin (prop priceOverrides).
//
// Task 18 — durante a temporada natalina (prop `festive`), o Vitalício vira
// "Presente de Natal": selo vermelho, preço em vermelho, caixa dourada
// "Dê este presente a você mesmo" e botão "Presentear um amigo" (modal em 3
// passos que registra o pedido no suporte). Fora da temporada (07/01+), tudo
// volta ao normal sozinho.

import { BadgeCheck, Gift, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { getPlans, type PlanInfo, type PlanPriceOverrides } from "@/lib/plans";
import { markCheckoutIntent } from "@/lib/recovery";
import { SupportButton } from "@/components/landing/SupportButton";
import { GiftModal } from "@/components/launch/GiftModal";

function PlanCard({
  plan,
  festive,
  onGift,
}: {
  plan: PlanInfo;
  festive: boolean;
  onGift: (plan: PlanInfo) => void;
}) {
  const [opening, setOpening] = useState(false);
  const isGift = festive && plan.highlight; // Presente de Natal = Vitalício

  const handleCheckout = () => {
    if (!plan.checkout) return;
    // Registra a intenção de compra: se o usuário voltar sem pagar,
    // o banner de recuperação mostra o que ele ganha/perde (anti-abandono).
    markCheckoutIntent(plan.id);
    setOpening(true);
    window.location.href = plan.checkout;
  };

  return (
    <div
      className={`dp-card relative flex flex-col rounded-3xl p-5 ${
        isGift ? "ring-2 ring-[#c1121f]" : plan.highlight ? "ring-2 ring-[#0e9b78]" : ""
      }`}
    >
      {/* Selo "Presente de Natal" no Vitalício (temporada natalina) */}
      {isGift && (
        <span
          className="absolute -top-3.5 right-4 rotate-3 rounded-full border-2 border-[#ffd166] bg-gradient-to-r from-[#c1121f] to-[#8f0f1a] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/30"
          data-testid="gift-seal"
        >
          🎁 Presente de Natal
        </span>
      )}
      {plan.highlight && !isGift && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
          Mais escolhido
        </span>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-extrabold dp-text-ink">{plan.name}</h3>
        <div className="text-right">
          {plan.anchor && (
            <p className="text-xs font-bold text-[#b3997f] line-through">{plan.anchor}</p>
          )}
          <p className={`text-2xl font-black tabular-nums ${isGift ? "text-[#c1121f]" : "text-[#0b7d61]"}`}>
            {plan.price}
          </p>
        </div>
      </div>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#8a7462]">
        {plan.period}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#6f5b47] leading-snug">{plan.tagline}</p>

      <ul className="mt-3 flex-1 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[13px] font-semibold text-[#4c5f54]">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0e9b78]" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isGift && (
        <div
          className="mt-3 rounded-2xl border border-[#ffd166]/70 bg-gradient-to-br from-[#fff7e0] to-[#ffedc2] p-3"
          data-testid="gift-copy"
        >
          <p className="text-[13px] font-black text-[#7a4d0a] leading-snug">
            🎄 Dê este presente a você mesmo — ou para quem está na batalha do concurso.
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-[#9a6b1a]">
            Acesso permanente pelo preço de lançamento: o presente que não sai de moda.
          </p>
        </div>
      )}

      {plan.checkout ? (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={opening}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold text-white shadow-md transition disabled:opacity-70 ${
            isGift
              ? "bg-gradient-to-r from-[#c1121f] to-[#8f0f1a] shadow-red-900/20 hover:from-[#a30f19] hover:to-[#7a0d15]"
              : "bg-gradient-to-r from-[#17b98c] to-[#0e9b78] shadow-emerald-900/20 hover:from-[#0fa87f] hover:to-[#0b7d61]"
          }`}
        >
          {opening && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {opening ? "Abrindo checkout…" : `Pagar com Pix · ${plan.price}`}
        </button>
      ) : (
        <div className="mt-4 rounded-xl bg-[#fdf3e6] p-3 text-center">
          <p className="text-xs font-bold text-[#8a6a52]">Checkout em liberação</p>
          {/* Sem e-mail visível: abre o modal de suporte */}
          <div className="mt-1">
            <SupportButton variant="link" label="Falar com o suporte" />
          </div>
        </div>
      )}

      {isGift && plan.checkout && (
        <button
          type="button"
          onClick={() => onGift(plan)}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[#c1121f]/70 bg-white px-5 py-2.5 text-sm font-black text-[#c1121f] transition hover:bg-[#fff5f4]"
          data-testid="gift-button"
        >
          <Gift className="h-4 w-4" aria-hidden="true" />
          Presentear um amigo
        </button>
      )}
    </div>
  );
}

export function PlansSection({
  compact = false,
  priceOverrides = {},
  festive = false,
}: {
  compact?: boolean;
  priceOverrides?: PlanPriceOverrides;
  /** Temporada natalina (01/11 → 06/01): selo/botão de presente no Vitalício. */
  festive?: boolean;
}) {
  const plans = getPlans(priceOverrides);
  const [giftPlan, setGiftPlan] = useState<PlanInfo | null>(null);

  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} festive={festive} onGift={setGiftPlan} />
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[#e7d9c4] bg-white/60 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0e9b78]" aria-hidden="true" />
        <p className="text-xs font-semibold text-[#6f5b47] leading-snug">
          Garantia legal de 7 dias (CDC, art. 49): não é para você? Reembolso direto na plataforma
          de pagamento. Pix processado pela Cakto com <strong>liberação automática</strong> — o
          acesso abre na hora em que o pagamento é confirmado.
        </p>
      </div>
      {!compact && (
        <p className="mt-2 text-center text-[11px] font-semibold text-[#a08a77]">
          Após pagar, informe o e-mail da compra em “Já paguei” (ou volte pela página de
          obrigado) para liberar o acesso neste aparelho.
        </p>
      )}

      {giftPlan && <GiftModal plan={giftPlan} onClose={() => setGiftPlan(null)} />}
    </div>
  );
}
