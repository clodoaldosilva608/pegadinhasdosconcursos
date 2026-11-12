"use client";

// Banner de recuperação de compra (anti-abandono).
// Aparece quando o visitante clicou em "Pagar com Pix" e voltou sem concluir:
// mostra o que ganha ao concluir vs. o que arrisca ao ficar de fora, com o
// botão de finalizar o Pix e a opção "agora não" (silencia por 7 dias).

import { useEffect, useState } from "react";
import { AlarmClock, Check, Loader2, ShieldCheck, X, XCircle } from "lucide-react";
import {
  checkoutUrlFor,
  dismissRecovery,
  getCheckoutIntent,
  isRecoveryDismissed,
  planName,
  RECOVERY_GAINS,
  RECOVERY_LOSSES,
  type CheckoutIntent,
} from "@/lib/recovery";
import { getStoredAccess } from "@/lib/accessStore";

export function RecoveryBanner({ enabled = true }: { enabled?: boolean }) {
  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const timer = window.setTimeout(() => {
      // Já tem acesso liberado neste aparelho? Não é caso de recuperação.
      if (getStoredAccess()) return;
      const stored = getCheckoutIntent();
      if (stored && !isRecoveryDismissed()) setIntent(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!enabled || !intent) return null;

  const url = checkoutUrlFor(intent.plan);

  const finalize = () => {
    if (!url) return;
    setOpening(true);
    window.location.href = url;
  };

  const dismiss = () => {
    dismissRecovery();
    setIntent(null);
  };

  return (
    <section
      className="dp-card relative rounded-3xl border-2 border-[#0e9b78]/40 p-5 shadow-lg shadow-emerald-900/10"
      aria-label="Retomar compra"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Agora não"
        className="absolute right-3 top-3 rounded-full p-1.5 text-[#a08a77] transition hover:bg-[#fdf3e6] hover:text-[#6f5b47]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf3e6] text-[#9a5b23]">
          <AlarmClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <h2 className="text-base font-extrabold dp-text-ink leading-tight">
            Sua compra do {planName(intent.plan)} ficou no meio do caminho
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-[#6f5b47] leading-snug">
            O Pix não foi concluído — e seu acesso ainda está a um minuto de distância. Veja o
            que está em jogo:
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#0e9b78]/30 bg-[#e0f3ed]/60 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#0b7d61]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Ao concluir, você leva
          </p>
          <ul className="mt-1.5 space-y-1">
            {RECOVERY_GAINS.slice(0, 3).map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[12px] font-semibold text-[#2f4a3c]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0e9b78]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#f3cfc5] bg-[#fdeeEA]/60 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#c2472f]">
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Se ficar de fora, você arrisca
          </p>
          <ul className="mt-1.5 space-y-1">
            {RECOVERY_LOSSES.slice(0, 3).map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[12px] font-semibold text-[#7a3524]">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e25744]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row">
        <button
          type="button"
          onClick={finalize}
          disabled={!url || opening}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70"
        >
          {opening && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {opening ? "Abrindo checkout…" : "Finalizar meu Pix agora"}
        </button>
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6f5b47]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#0e9b78]" aria-hidden="true" />
          Garantia de 7 dias (CDC, art. 49)
        </p>
      </div>
    </section>
  );
}
