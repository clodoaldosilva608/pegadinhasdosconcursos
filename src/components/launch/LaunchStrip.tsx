"use client";

// Faixa fixa na parte inferior do /app durante o lançamento gratuito:
// lembrete com cronômetro regressivo + convite rápido ao funil (LGPD).
// Pode ser dispensada (persistido no localStorage).

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Countdown } from "@/components/launch/Countdown";
import { LeadForm } from "@/components/launch/LeadForm";

const DISMISS_KEY = "dp-launch-strip-dismissed";

export function LaunchStrip({ freeUntil }: { freeUntil: string }) {
  const [dismissed, setDismissed] = useState(true); // SSR: oculto; decide no cliente
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        setDismissed(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* modo privado */
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#0e9b78]/30 bg-[#fdf3e6]/95 px-3 py-2 shadow-[0_-6px_24px_rgba(35,48,40,0.12)] backdrop-blur-md sm:px-4"
      role="region"
      aria-label="Aviso do lançamento gratuito"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex shrink-0 items-center rounded-full bg-[#0e9b78] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
              Lançamento
            </span>
            <p className="truncate text-[11px] font-extrabold text-[#233028] sm:text-xs">
              Acesso 100% grátis até <span className="text-[#0b7d61]">01/01/2027</span>
            </p>
            <div className="hidden sm:block">
              <Countdown untilIso={freeUntil} size="sm" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-[#0e9b78]/35 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-[#0b7d61] transition hover:bg-white"
              aria-expanded={showForm}
            >
              {showForm ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Receber avisos
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#8a7462] transition hover:bg-[#f0e2cf]"
              aria-label="Dispensar aviso do lançamento"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="sm:hidden">
          <Countdown untilIso={freeUntil} size="sm" />
        </div>
        {showForm && (
          <div className="dp-card rounded-2xl p-3">
            <p className="mb-2 text-[11px] font-extrabold text-[#6f5b47]">
              Entre na lista para receber novidades e ofertas — até depois do lançamento.
            </p>
            <LeadForm source="app" compact />
          </div>
        )}
      </div>
    </div>
  );
}
