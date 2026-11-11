"use client";

import { useState } from "react";
import { Building2, CheckCircle2, Target, ArrowRight, Pencil, Loader2 } from "lucide-react";
import type { ExtractedQuestion } from "@/lib/types";

interface ConfirmViewProps {
  question: ExtractedQuestion;
  images: string[];
  onConfirm: (correctLetter: string, userMarked: string) => void;
  onEdit: () => void;
  loading?: boolean;
}

export function ConfirmView({ question, images, onConfirm, onEdit, loading }: ConfirmViewProps) {
  const [correctLetter, setCorrectLetter] = useState("");
  const [userMarked, setUserMarked] = useState("");

  const canConfirm = Boolean(correctLetter) && userMarked !== "";

  return (
    <div className="dp-fade-up space-y-4">
      <div className="dp-card rounded-3xl p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[#6f8a7e]">Questão analisada:</span>
          {question.organization && question.organization !== "Não identificada" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4f1] px-2.5 py-1 text-xs font-extrabold text-[#486a5c]">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {question.organization}
            </span>
          )}
          {question.year && (
            <span className="rounded-full bg-[#eef4f1] px-2.5 py-1 text-xs font-extrabold text-[#486a5c]">
              {question.year}
            </span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed dp-text-ink">
          {question.questionText}
        </p>
        {question.observations && (
          <p className="mt-2 rounded-xl bg-[#fdf6ec] p-3 text-xs text-[#8a7462]">
            {question.observations}
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {question.options.map((opt) => (
            <li
              key={opt.letter}
              className="flex gap-3 rounded-xl border border-[#eee2d4] bg-white/70 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3eadf] text-sm font-extrabold text-[#6f5b47]">
                {opt.letter}
              </span>
              <span className="text-sm leading-relaxed dp-text-ink">{opt.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="dp-card rounded-3xl p-4 sm:p-6">
        <h2 className="text-lg font-extrabold dp-text-ink">
          Antes de caçar as pegadinhas, confirme:
        </h2>
        <p className="mt-1 text-sm text-[#8a7462]">
          O detector vai cruzar o gabarito oficial com a sua marcação para explicar o que te pegou.
        </p>

        <fieldset className="mt-4">
          <legend className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-[#0b7d61]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Qual é o gabarito oficial?
          </legend>
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <button
                key={`g-${opt.letter}`}
                type="button"
                disabled={loading}
                onClick={() => setCorrectLetter(opt.letter)}
                aria-pressed={correctLetter === opt.letter}
                className={`h-11 w-11 rounded-xl border-2 text-base font-extrabold transition ${
                  correctLetter === opt.letter
                    ? "border-[#0e9b78] bg-[#0e9b78] text-white shadow-md shadow-emerald-900/25"
                    : "border-[#e4d2bf] bg-white/80 text-[#6f5b47] hover:border-[#0e9b78]"
                }`}
              >
                {opt.letter}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-[#d1502f]">
            <Target className="h-4 w-4" aria-hidden="true" />
            Qual você marcou?
          </legend>
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <button
                key={`m-${opt.letter}`}
                type="button"
                disabled={loading}
                onClick={() => setUserMarked(opt.letter)}
                aria-pressed={userMarked === opt.letter}
                className={`h-11 w-11 rounded-xl border-2 text-base font-extrabold transition ${
                  userMarked === opt.letter
                    ? "border-[#e25744] bg-[#e25744] text-white shadow-md shadow-red-900/20"
                    : "border-[#e4d2bf] bg-white/80 text-[#6f5b47] hover:border-[#e25744]"
                }`}
              >
                {opt.letter}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!canConfirm || loading}
            onClick={() => onConfirm(correctLetter, userMarked)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0e9b78] px-5 py-3.5 text-base font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:bg-[#0b7d61] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Analisando pegadinhas…
              </>
            ) : (
              <>
                Analisar pegadinhas
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#e4d2bf] bg-white/80 px-5 py-3.5 text-base font-bold text-[#6f5b47] transition hover:border-[#0e9b78] hover:text-[#0e9b78] disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Corrigir leitura
          </button>
        </div>
      </div>

      {images.length > 0 && (
        <details className="dp-card rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-bold text-[#6f5b47]">
            Ver as {images.length} imagem(ns) enviada(s)
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Imagem enviada ${i + 1}`}
                className="h-24 w-20 rounded-lg border border-white object-cover shadow"
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
