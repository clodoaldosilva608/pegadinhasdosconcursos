"use client";

import { useEffect, useState } from "react";
import { ScanText, ListChecks, Lightbulb, Loader2 } from "lucide-react";

const STEPS = [
  { icon: ScanText, label: "Lendo a questão e o gabarito…" },
  { icon: ListChecks, label: "Cruzando o que você marcou com o gabarito…" },
  { icon: Lightbulb, label: "Caçando os distratores e operadores semânticos…" },
];

export function AnalyzingView() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const Current = STEPS[step];

  return (
    <div className="dp-fade-up dp-card flex min-h-[380px] flex-col items-center justify-center gap-6 rounded-3xl p-8 text-center">
      <div className="relative">
        <div
          className="dp-pulse relative flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-xl shadow-emerald-900/25"
          style={{ background: "linear-gradient(135deg, #14b98d 0%, #0b7d61 100%)" }}
        >
          <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-extrabold dp-text-ink">Detector em ação!</h2>
        <p className="mx-auto flex max-w-xs items-center justify-center gap-2 text-sm font-semibold text-[#8a7462]">
          <Current.icon className="h-4 w-4 shrink-0 text-[#0e9b78]" aria-hidden="true" />
          {Current.label}
        </p>
      </div>

      <div className="flex items-center gap-2" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === step ? "w-7 bg-[#0e9b78]" : "w-2 bg-[#d8c7b5]"
            }`}
          />
        ))}
      </div>

      <p className="max-w-sm text-xs leading-relaxed text-[#a08a77]">
        Enquanto isso, respira: cada análise aqui é uma pegadinha a menos na hora da prova.
      </p>
    </div>
  );
}
