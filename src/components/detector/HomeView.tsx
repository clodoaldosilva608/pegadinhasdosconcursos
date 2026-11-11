"use client";

import { Camera, ListChecks, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { UploadZone } from "./UploadZone";
import { AiKeySection } from "./AiKeySection";
import type { AccountInfo } from "@/lib/types";

interface HomeViewProps {
  account: AccountInfo | null;
  images: string[];
  onImagesChange: (imgs: string[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const FLOW_STEPS = [
  { icon: Camera, label: "Mande a questão" },
  { icon: ListChecks, label: "Confirme o que marcou" },
  { icon: Lightbulb, label: "Entenda a pegadinha" },
];

export function HomeView({
  account,
  images,
  onImagesChange,
  notes,
  onNotesChange,
  onSubmit,
  loading,
}: HomeViewProps) {
  const canSubmit = (images.length > 0 || notes.trim().length > 3) && !loading;
  const outOfCredits = account !== null && account.analysesLeft <= 0;

  return (
    <div className="dp-fade-up space-y-4">
      {/* Conta interna */}
      <section
        className="dp-card flex items-center gap-3 rounded-2xl p-4"
        aria-label="Informações da conta"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold dp-text-ink">
            {account?.planLabel ?? "Conta interna"}
          </p>
          <p className="text-xs font-semibold text-[#8a7462]">
            {account
              ? `${account.analysesLeft} análises · ${account.noDeadline ? "sem prazo" : "com prazo"}`
              : "carregando…"}
          </p>
        </div>
      </section>

      {/* Chave de IA do usuário (BYOK) */}
      <AiKeySection />

      {/* CTA verde */}
      <section
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-900/25"
        style={{ background: "linear-gradient(135deg, #17b98c 0%, #0e9b78 55%, #0b7d61 100%)" }}
        aria-label="Como funciona"
      >
        <div
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <h2 className="text-xl sm:text-2xl font-black leading-tight">
          Errou e não entendeu por quê?
        </h2>
        <p className="mt-1.5 max-w-xl text-sm sm:text-[0.95rem] font-medium text-white/90 leading-relaxed">
          Manda a questão. A gente mostra qual pegadinha te pegou e como não cair nela de novo.
        </p>

        <ol className="mt-4 grid grid-cols-3 gap-2">
          {FLOW_STEPS.map((step, i) => (
            <li
              key={step.label}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/25 bg-white/12 px-2 py-3 text-center backdrop-blur-sm"
            >
              <step.icon className="h-5 w-5 text-white" aria-hidden="true" />
              <span className="text-[11px] sm:text-xs font-bold leading-tight text-white">
                {step.label}
              </span>
              <span className="text-[10px] font-black text-white/60">PASSO {i + 1}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Upload */}
      <UploadZone
        images={images}
        onImagesChange={onImagesChange}
        notes={notes}
        onNotesChange={onNotesChange}
        disabled={loading}
      />

      {outOfCredits && (
        <p className="rounded-2xl border border-[#f3cfc5] bg-[#fdeeEA] p-3 text-center text-sm font-bold text-[#b03a24]">
          Suas análises acabaram. Fale com o time Con-curso para renovar sua conta.
        </p>
      )}

      {/* Botão enviar */}
      <button
        type="button"
        disabled={!canSubmit || outOfCredits}
        onClick={onSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Lendo a questão…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            Mandar para o Detector
          </>
        )}
      </button>

      <p className="text-center text-xs font-semibold text-[#a08a77]">
        Cada envio consome 1 análise da sua conta · {account?.analysesLeft ?? "—"} restantes
      </p>
    </div>
  );
}
