"use client";

import { Fragment } from "react";
import {
  Building2,
  CheckCircle2,
  Target,
  BookOpen,
  Crosshair,
  Layers,
  FileText,
  GraduationCap,
  Lightbulb,
  ArrowRight,
  Quote,
} from "lucide-react";
import type { AnalysisResult, AnalyzedOption } from "@/lib/types";

interface ResultViewProps {
  result: AnalysisResult;
  onNewQuestion: () => void;
}

function renderTextWithTraps(option: AnalyzedOption) {
  const text = option.text;
  const phrases = (option.trapPhrases ?? [])
    .filter((p) => p.text && p.text.length > 1)
    .map((p) => ({ ...p, index: text.indexOf(p.text) }))
    .filter((p) => p.index >= 0)
    .sort((a, b) => a.index - b.index);

  if (phrases.length === 0) return <span>{text}</span>;

  const segments: Array<{ type: "plain" | "trap"; content: string; anchor?: number }> = [];
  let cursor = 0;
  for (const p of phrases) {
    if (p.index < cursor) continue; // evita sobreposição
    if (p.index > cursor) segments.push({ type: "plain", content: text.slice(cursor, p.index) });
    segments.push({ type: "trap", content: text.slice(p.index, p.index + p.text.length), anchor: p.anchor });
    cursor = p.index + p.text.length;
  }
  if (cursor < text.length) segments.push({ type: "plain", content: text.slice(cursor) });

  return (
    <span>
      {segments.map((seg, i) =>
        seg.type === "plain" ? (
          <Fragment key={i}>{seg.content}</Fragment>
        ) : (
          <span key={i}>
            <span className="dp-trap-hl">{seg.content}</span>
            <span className="dp-anchor bg-[#e25744]">{seg.anchor}</span>
          </span>
        )
      )}
    </span>
  );
}

export function ResultView({ result, onNewQuestion }: ResultViewProps) {
  const correct = result.options.find((o) => o.isCorrect);
  const marked = result.options.find((o) => o.isUserMarked);
  const userErred = marked && correct && marked.letter !== correct.letter;

  return (
    <div className="dp-fade-up space-y-4">
      {/* ===== Questão analisada ===== */}
      <section className="dp-card rounded-3xl p-4 sm:p-6" aria-label="Questão analisada">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6f8a7e]">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Questão analisada:
          </span>
          {result.organization && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4f1] px-2.5 py-1 text-xs font-extrabold text-[#486a5c]">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {result.organization}
            </span>
          )}
          {result.year && (
            <span className="rounded-full bg-[#eef4f1] px-2.5 py-1 text-xs font-extrabold text-[#486a5c]">
              {result.year}
            </span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed dp-text-ink">
          {result.questionText}
        </p>

        <ul className="mt-4 space-y-2.5">
          {result.options.map((opt) => {
            const isMarked = opt.isUserMarked;
            const isCorrect = opt.isCorrect;
            return (
              <li
                key={opt.letter}
                className={`rounded-2xl border-2 p-3 sm:p-4 transition ${
                  isCorrect
                    ? "border-[#16a37c] bg-[#ecf9f2]"
                    : isMarked
                      ? "border-[#e25744] bg-[#fdeeEA]"
                      : "border-[#eee2d4] bg-white/70"
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${
                      isCorrect ? "bg-[#16a37c]" : isMarked ? "bg-[#e25744]" : "bg-[#b9a68f]"
                    }`}
                  >
                    {opt.letter}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-[0.95rem] leading-relaxed dp-text-ink">
                      {renderTextWithTraps(opt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {isMarked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fbe0d9] px-2.5 py-1 text-[11px] font-extrabold text-[#b03a24]">
                          <Target className="h-3 w-3" aria-hidden="true" />
                          Você marcou esta
                        </span>
                      )}
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#d8f1e4] px-2.5 py-1 text-[11px] font-extrabold text-[#0b7d61]">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Alternativa correta
                        </span>
                      )}
                      {opt.distractorType && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                            isCorrect
                              ? "bg-[#d8f1e4] text-[#0b7d61]"
                              : isMarked
                                ? "bg-[#fbe0d9] text-[#b03a24]"
                                : "bg-[#f3eadf] text-[#8a6a52]"
                          }`}
                        >
                          <Crosshair className="h-3 w-3" aria-hidden="true" />
                          {opt.distractorType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-[#a08a77]">
          Os trechos destacados são onde a pegadinha mora. Os números ①②③ apontam cada armadilha na ordem em que aparecem.
        </p>
      </section>

      {/* ===== Onde está a pegadinha ===== */}
      {result.trapLocation?.explicacao && (
        <section
          className="rounded-3xl border border-[#f2c48d]/70 bg-gradient-to-br from-[#fdf1de] to-[#fbe6c8] p-4 sm:p-6 shadow-sm"
          aria-label="Onde está a pegadinha"
        >
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#b45309]">
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            Onde está a pegadinha
            {result.trapLocation.distratorNome && (
              <span className="text-[#8a6a52]">· {result.trapLocation.distratorNome}</span>
            )}
          </h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed dp-text-ink">
            {result.trapLocation.explicacao}
          </p>
        </section>
      )}

      {/* ===== Por que você errou ===== */}
      {result.whyYouErred?.whyMarkedSeemedCorrect && (
        <section className="space-y-2" aria-label="Por que você errou">
          <h3 className="flex items-center gap-2 px-1 text-base font-extrabold dp-text-ink">
            <BookOpen className="h-5 w-5 text-[#0e9b78]" aria-hidden="true" />
            {userErred ? "Por que você errou" : "Por que você acertou"}
          </h3>
          <div className={`grid gap-3 ${userErred ? "sm:grid-cols-2" : ""}`}>
            <article className="rounded-2xl border border-[#f3cfc5] bg-[#fdeeEA] p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e25744] text-sm font-extrabold text-white">
                  {result.whyYouErred.markedLetter || marked?.letter}
                </span>
                <h4 className="text-sm font-extrabold text-[#b03a24]">
                  {userErred
                    ? `Por que a alternativa ${result.whyYouErred.markedLetter || marked?.letter} te pareceu correta:`
                    : "Você mandou bem! Reforço do raciocínio:"}
                </h4>
              </div>
              <p className="mt-2 text-sm leading-relaxed dp-text-ink">
                {result.whyYouErred.whyMarkedSeemedCorrect}
              </p>
            </article>

            {userErred && (
              <article className="rounded-2xl border border-[#c8ecd9] bg-[#ecf9f2] p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16a37c] text-sm font-extrabold text-white">
                    {result.whyYouErred.correctLetter || correct?.letter}
                  </span>
                  <h4 className="text-sm font-extrabold text-[#0b7d61]">
                    Por que a alternativa {result.whyYouErred.correctLetter || correct?.letter} é a
                    correta:
                  </h4>
                </div>
                <p className="mt-2 text-sm leading-relaxed dp-text-ink">
                  {result.whyYouErred.whyCorrectIsCorrect}
                </p>
              </article>
            )}
          </div>
        </section>
      )}

      {/* ===== Por que as outras estão erradas — Método 3C ===== */}
      {result.threeC?.length > 0 && (
        <section className="space-y-2" aria-label="Por que as outras estão erradas">
          <h3 className="flex items-center gap-2 px-1 text-base font-extrabold dp-text-ink">
            <Layers className="h-5 w-5 text-[#0e9b78]" aria-hidden="true" />
            Por que as outras estão erradas
          </h3>
          <p className="px-1 text-xs font-semibold text-[#8a7462]">
            Cada alternativa no Método 3C: Conteúdo, Distrator utilizado e Operador Semântico.
          </p>
          <div className="space-y-3">
            {result.threeC.map((c) => {
              const opt = result.options.find((o) => o.letter === c.letter);
              const isMarked = opt?.isUserMarked;
              return (
                <article
                  key={c.letter}
                  className={`dp-card rounded-2xl p-4 ${isMarked ? "ring-2 ring-[#e25744]/40" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold text-white ${
                        isMarked ? "bg-[#e25744]" : "bg-[#b9a68f]"
                      }`}
                    >
                      {c.letter}
                    </span>
                    <h4 className="text-sm font-extrabold dp-text-ink">Alternativa {c.letter}</h4>
                    {isMarked && (
                      <span className="rounded-full bg-[#fbe0d9] px-2 py-0.5 text-[10px] font-extrabold text-[#b03a24]">
                        Você marcou esta
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 space-y-3">
                    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
                      <dt className="text-[11px] font-black uppercase tracking-wider text-[#0e9b78]">
                        Conteúdo
                      </dt>
                      <dd className="text-sm leading-relaxed dp-text-ink">{c.conteudo}</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
                      <dt className="text-[11px] font-black uppercase tracking-wider text-[#0e9b78]">
                        Distrator utilizado
                      </dt>
                      <dd className="text-sm leading-relaxed dp-text-ink">
                        <strong className="font-extrabold">{c.distratorNome}</strong>.{" "}
                        {c.distratorExplicacao}
                      </dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
                      <dt className="text-[11px] font-black uppercase tracking-wider text-[#0e9b78]">
                        Operador semântico
                      </dt>
                      <dd className="text-sm leading-relaxed dp-text-ink">{c.operadorSemantico}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Operadores semânticos ===== */}
      {result.semanticOperators?.length > 0 && (
        <section className="space-y-2" aria-label="Os operadores semânticos desta questão">
          <h3 className="flex items-center gap-2 px-1 text-base font-extrabold dp-text-ink">
            <GraduationCap className="h-5 w-5 text-[#0e9b78]" aria-hidden="true" />
            Os operadores semânticos desta questão
          </h3>
          <p className="px-1 text-xs font-semibold text-[#8a7462]">
            A palavra, o verbo, o prefixo ou o conector que executa a pegadinha nem sempre é o
            conteúdo.
          </p>
          <div className="space-y-3">
            {result.semanticOperators.map((op, i) => (
              <article key={`${op.nome}-${op.letter}-${i}`} className="dp-card rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e0f3ed] text-xs font-black text-[#0b7d61]">
                    {i + 1}
                  </span>
                  <h4 className="text-sm font-extrabold dp-text-ink">{op.nome}</h4>
                  <span className="rounded-full bg-[#f3eadf] px-2 py-0.5 text-[10px] font-extrabold text-[#8a6a52]">
                    Alternativa {op.letter}
                  </span>
                </div>
                {op.quote && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm font-extrabold text-[#b45309]">
                    <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="italic">&quot;{op.quote}&quot;</span>
                  </p>
                )}
                <p className="mt-1.5 text-sm leading-relaxed dp-text-ink">{op.explicacao}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ===== Dica para a prova ===== */}
      {result.examTip && (
        <section
          className="rounded-3xl border border-[#f2c48d]/70 bg-gradient-to-br from-[#fdf3e0] to-[#fbe8c9] p-4 sm:p-6"
          aria-label="Dica para a prova"
        >
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#b45309]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f59e0b] text-white">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            Dica para a prova
          </h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed dp-text-ink">{result.examTip}</p>
        </section>
      )}

      {/* ===== CTA nova questão ===== */}
      <button
        type="button"
        onClick={onNewQuestion}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
      >
        Entendi, mandar outra questão
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
