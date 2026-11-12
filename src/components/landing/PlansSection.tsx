"use client";

// Seção de planos (Passe 30 dias / Vitalício) — usada na landing e no
// bloqueio de acesso. Checkout via Cakto (Pix), liberação automática.
// Preços podem ser sobrescritos pelo painel admin (prop priceOverrides).

import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { getPlans, type PlanInfo, type PlanPriceOverrides } from "@/lib/plans";
import { markCheckoutIntent } from "@/lib/recovery";
import { SupportButton } from "@/components/landing/SupportButton";

function PlanCard({ plan }: { plan: PlanInfo }) {
  const [opening, setOpening] = useState(false);

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
        plan.highlight ? "ring-2 ring-[#0e9b78]" : ""
      }`}
    >
      {plan.highlight && (
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
          <p className="text-2xl font-black text-[#0b7d61] tabular-nums">{plan.price}</p>
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

      {plan.checkout ? (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={opening}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70"
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
    </div>
  );
}

export function PlansSection({
  compact = false,
  priceOverrides = {},
}: {
  compact?: boolean;
  priceOverrides?: PlanPriceOverrides;
}) {
  const plans = getPlans(priceOverrides);
  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
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
    </div>
  );
}
