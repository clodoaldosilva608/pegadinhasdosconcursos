"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  ChevronDown,
  Flame,
  GraduationCap,
  Quote,
  RotateCcw,
  ScanSearch,
  Target,
  TriangleAlert,
  Trophy,
  XCircle,
} from "lucide-react";

interface VocabItem {
  word: string;
  meaning: string;
  highlight?: boolean;
}

interface VocabBlock {
  id: number;
  title: string;
  emoji: string;
  theme: "blue" | "orange";
  items: VocabItem[];
}

const VOCAB_BLOCKS: VocabBlock[] = [
  {
    id: 1,
    title: "Prioridade",
    emoji: "🎯",
    theme: "orange",
    items: [
      { word: "Sobretudo", meaning: "principalmente" },
      { word: "Precipuamente", meaning: "prioritariamente" },
      { word: "Preponderante", meaning: "predominante, mais importante" },
      { word: "Meramente", meaning: "apenas, somente" },
    ],
  },
  {
    id: 2,
    title: "Pode ou não pode",
    emoji: "⚖️",
    theme: "blue",
    items: [
      { word: "Prescindível", meaning: "dispensável (pode deixar de fazer)" },
      { word: "Imprescindível", meaning: "que NÃO pode ser dispensado", highlight: true },
      { word: "Defeso", meaning: "proibido, vedado" },
      { word: "Eventual", meaning: "que pode acontecer" },
      { word: "Contemporâneo", meaning: "da mesma época" },
    ],
  },
  {
    id: 3,
    title: "Agir sobre o problema",
    emoji: "🛠️",
    theme: "orange",
    items: [
      { word: "Mitigar", meaning: "reduzir, suavizar" },
      { word: "Obstar", meaning: "impedir, dificultar" },
      { word: "Deflagrar", meaning: "iniciar, desencadear" },
      { word: "Suscitar", meaning: "provocar, levantar uma questão" },
      { word: "Exaurir", meaning: "esgotar completamente" },
    ],
  },
  {
    id: 4,
    title: "Clareza e coerência",
    emoji: "💡",
    theme: "blue",
    items: [
      { word: "Inequívoco", meaning: "claro, evidente" },
      { word: "Plausível", meaning: "razoável, aceitável" },
      { word: "Congruente", meaning: "coerente, compatível" },
      { word: "Análogo", meaning: "semelhante" },
      { word: "Inerente", meaning: "próprio de algo, inseparável" },
    ],
  },
  {
    id: 5,
    title: "Posicionamento",
    emoji: "🧭",
    theme: "orange",
    items: [
      { word: "Divergir", meaning: "discordar, diferir" },
      { word: "Ratificar", meaning: "confirmar, validar" },
      { word: "Retratar-se", meaning: "voltar atrás, corrigir uma declaração" },
      { word: "Intransigente", meaning: "inflexível, rígido" },
      { word: "Aludir", meaning: "fazer referência, mencionar" },
    ],
  },
  {
    id: 6,
    title: "Negação e dispensa",
    emoji: "🚫",
    theme: "blue",
    items: [
      { word: "Prescindir", meaning: "dispensar, abrir mão de" },
      { word: "Abster-se", meaning: "não comparecer; recusar-se a fazer" },
      { word: "Tacitamente", meaning: "de forma implícita, sem declarar" },
      { word: "Ab-rogar", meaning: "revogar totalmente uma lei" },
      { word: "Derrogar", meaning: "revogar parcialmente uma lei" },
    ],
  },
  {
    id: 7,
    title: "Tempo e ocorrência",
    emoji: "⏱️",
    theme: "orange",
    items: [
      { word: "Concomitante", meaning: "ao mesmo tempo, simultâneo" },
      { word: "Hodierno", meaning: "atual, do dia de hoje" },
      { word: "Eventualmente", meaning: "por acaso, ocasionalmente" },
      { word: "Periodicamente", meaning: "com regularidade, em intervalos" },
      { word: "Sucessivamente", meaning: "um após o outro, repetidamente" },
    ],
  },
  {
    id: 8,
    title: "Latim jurídico",
    emoji: "📜",
    theme: "blue",
    items: [
      { word: "Sine qua non", meaning: "indispensável, condição essencial" },
      { word: "A priori", meaning: "antes da experiência, prévio" },
      { word: "A posteriori", meaning: "a partir dos fatos, posterior" },
      { word: "Ad hoc", meaning: "para esta finalidade específica" },
      { word: "De jure", meaning: "de direito, pela norma" },
      { word: "De facto", meaning: "de fato, na prática" },
    ],
  },
];

const TOTAL_WORDS = VOCAB_BLOCKS.reduce((n, b) => n + b.items.length, 0);
const ROUND_SIZE = 10;
const BEST_KEY = "dp-vocab-quiz-best";

const THEME = {
  blue: {
    word: "text-[#24406e]",
    chip: "bg-[#e6edf8]",
    ring: "border-[#c9d8ef]",
  },
  orange: {
    word: "text-[#b45309]",
    chip: "bg-[#fdeeda]",
    ring: "border-[#f2c48d]",
  },
} as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

interface QuizQuestion {
  kind: "word2meaning" | "meaning2word";
  word: string;
  meaning: string;
  blockTitle: string;
  options: string[];
  answerIndex: number;
}

function buildRound(size: number = ROUND_SIZE): QuizQuestion[] {
  const pool = VOCAB_BLOCKS.flatMap((b) =>
    b.items.map((it) => ({ word: it.word, meaning: it.meaning, blockTitle: b.title }))
  );
  const picks = shuffle(pool).slice(0, Math.min(size, pool.length));
  return picks.map((pick, idx) => {
    const kind: QuizQuestion["kind"] = idx % 2 === 0 ? "word2meaning" : "meaning2word";
    const correct = kind === "word2meaning" ? pick.meaning : pick.word;
    const values = Array.from(
      new Set(pool.map((p) => (kind === "word2meaning" ? p.meaning : p.word)))
    ).filter((v) => v !== correct);
    const distractors = shuffle(values).slice(0, 3);
    const options = shuffle([correct, ...distractors]);
    return {
      kind,
      word: pick.word,
      meaning: pick.meaning,
      blockTitle: pick.blockTitle,
      options,
      answerIndex: options.indexOf(correct),
    };
  });
}

const LETTERS = ["A", "B", "C", "D"];

// Recorde persistido (store externo: localStorage + evento de mudança)
function subscribeBest(cb: () => void) {
  window.addEventListener("dp-best-change", cb);
  return () => window.removeEventListener("dp-best-change", cb);
}
function getBestSnapshot(): number | null {
  const saved = window.localStorage.getItem(BEST_KEY);
  if (!saved) return null;
  const n = Number(saved);
  return Number.isNaN(n) ? null : n;
}
function getBestServerSnapshot(): number | null {
  return null;
}

function resultMessage(score: number, total: number): string {
  const ratio = score / total;
  if (ratio === 1) return "Perfeito! Você é fluente no vocabulário da banca. 🏆";
  if (ratio >= 0.7) return "Muito bem! Faltou pouco para o 10 — revise as que errou.";
  if (ratio >= 0.4) return "Boa base! Agora é revisar os blocos e tentar de novo.";
  return "Sem crise: é assim que se aprende. Reveja os blocos e volte ao treino!";
}

function QuizView({ onExit }: { onExit: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missed, setMissed] = useState<Array<{ word: string; meaning: string }>>([]);
  const best = useSyncExternalStore(subscribeBest, getBestSnapshot, getBestServerSnapshot);

  const start = () => {
    setQuestions(buildRound());
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMissed([]);
  };

  const finished = questions !== null && current >= questions.length;

  // Ao encerrar, grava o recorde no sistema externo (localStorage) e notifica
  useEffect(() => {
    if (!finished) return;
    const currentBest = Number(window.localStorage.getItem(BEST_KEY) ?? "NaN");
    if (Number.isNaN(currentBest) || score > currentBest) {
      window.localStorage.setItem(BEST_KEY, String(score));
      window.dispatchEvent(new Event("dp-best-change"));
    }
  }, [finished, score]);

  const answer = (idx: number) => {
    if (selected !== null || !questions) return;
    setSelected(idx);
    const q = questions[current];
    if (idx === q.answerIndex) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((bs) => Math.max(bs, next));
        return next;
      });
    } else {
      setStreak(0);
      setMissed((m) => [...m, { word: q.word, meaning: q.meaning }]);
    }
  };

  const next = () => {
    setCurrent((c) => c + 1);
    setSelected(null);
  };

  // Tela inicial do treino
  if (questions === null) {
    return (
      <section className="dp-card rounded-3xl p-5 sm:p-6" aria-label="Modo treino">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e0f3ed] text-[#0e9b78]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold dp-text-ink">Modo treino</h2>
        </div>
        <p className="mt-3 text-sm sm:text-[0.95rem] leading-relaxed dp-text-ink">
          Rodada de <strong>{ROUND_SIZE} perguntas</strong> sorteadas dos{" "}
          <strong>{VOCAB_BLOCKS.length} blocos</strong> ({TOTAL_WORDS} palavras). Pode vir de dois
          jeitos: <em>a palavra aparece e você escolhe o significado</em>, ou{" "}
          <em>o significado aparece e você escolhe a palavra</em>. Errou? Sem problema — a
          correção mostra o significado na hora, que é assim que fixa.
        </p>
        {best !== null && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fdf1de] px-3 py-1.5 text-xs font-extrabold text-[#b45309]">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            Seu recorde: {best}/{ROUND_SIZE}
          </p>
        )}
        <button
          type="button"
          onClick={start}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0e9b78] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:brightness-110 active:scale-[0.99]"
        >
          <Target className="h-5 w-5" aria-hidden="true" />
          Começar o treino
        </button>
        <button
          type="button"
          onClick={onExit}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e8dbca] bg-white/70 px-4 py-3 text-sm font-extrabold text-[#8a6a52] transition hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar aos blocos
        </button>
      </section>
    );
  }

  // Resultado da rodada
  if (finished) {
    return (
      <section className="dp-card rounded-3xl p-5 sm:p-6" aria-label="Resultado do treino">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e0f3ed] text-[#0e9b78]">
            <Trophy className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-3 text-3xl font-black tabular-nums dp-text-ink">
            {score}/{questions.length}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#8a6a52]">{resultMessage(score, questions.length)}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e0f3ed] px-3 py-1.5 text-xs font-extrabold text-[#0b7d61]">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              Sequência máxima: {bestStreak}
            </span>
            {best !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf1de] px-3 py-1.5 text-xs font-extrabold text-[#b45309]">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                Recorde: {best}/{ROUND_SIZE}
              </span>
            )}
          </div>
        </div>

        {missed.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#f2c48d]/70 bg-[#fdf6ec] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#b45309]">
              Palavras para revisar
            </p>
            <ul className="mt-2 space-y-1.5">
              {missed.map((m) => (
                <li key={m.word} className="text-sm leading-snug dp-text-ink">
                  <strong className="text-[#b45309]">{m.word}</strong>
                  <span className="text-[#a08a77]"> → </span>
                  {m.meaning}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={start}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0e9b78] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:brightness-110 active:scale-[0.99]"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          Jogar de novo
        </button>
        <button
          type="button"
          onClick={onExit}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e8dbca] bg-white/70 px-4 py-3 text-sm font-extrabold text-[#8a6a52] transition hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Ver os blocos de vocabulário
        </button>
      </section>
    );
  }

  // Pergunta corrente
  const q = questions[current];
  const answered = selected !== null;
  const isCorrect = answered && selected === q.answerIndex;

  return (
    <section className="dp-card rounded-3xl p-5 sm:p-6" aria-label="Pergunta do treino">
      {/* Progresso */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-[#8a6a52]">
          Pergunta {current + 1} de {questions.length}
        </p>
        <div className="flex items-center gap-1.5">
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fdeeda] px-2 py-0.5 text-[11px] font-extrabold text-[#b45309]">
              <Flame className="h-3 w-3" aria-hidden="true" />
              {streak} seguidas
            </span>
          )}
          <span className="rounded-full bg-[#e0f3ed] px-2 py-0.5 text-[11px] font-extrabold text-[#0b7d61] tabular-nums">
            {score} acerto{score === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#eef3ee]"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
      >
        <div
          className="h-full rounded-full bg-[#0e9b78] transition-all duration-300"
          style={{ width: `${((current + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Enunciado */}
      <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-[#b09377]">
        {q.kind === "word2meaning" ? "O que significa?" : "Qual palavra significa?"}
      </p>
      {q.kind === "word2meaning" ? (
        <h3 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#24406e]">{q.word}</h3>
      ) : (
        <h3 className="mt-1 text-lg sm:text-xl font-extrabold leading-snug dp-text-ink">
          &quot;{q.meaning}&quot;
        </h3>
      )}
      <p className="mt-0.5 text-[11px] font-semibold text-[#b09377]">
        Bloco {q.blockTitle}
      </p>

      {/* Opções */}
      <ul className="mt-3 space-y-2">
        {q.options.map((opt, i) => {
          const chosen = selected === i;
          const correctOne = answered && i === q.answerIndex;
          const wrongOne = answered && chosen && !correctOne;
          return (
            <li key={opt}>
              <button
                type="button"
                onClick={() => answer(i)}
                disabled={answered}
                aria-pressed={chosen}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition ${
                  correctOne
                    ? "border-[#0e9b78] bg-[#e6f6f0]"
                    : wrongOne
                      ? "border-red-300 bg-[#fdecec]"
                      : chosen
                        ? "border-[#0e9b78]/50 bg-[#f3faf7]"
                        : "border-[#e8dbca] bg-white/70 hover:border-[#0e9b78]/50 hover:bg-[#f3faf7]"
                } ${answered ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                    correctOne
                      ? "bg-[#0e9b78] text-white"
                      : wrongOne
                        ? "bg-red-400 text-white"
                        : "bg-[#fbf7f1] text-[#8a6a52]"
                  }`}
                  aria-hidden="true"
                >
                  {LETTERS[i]}
                </span>
                <span className={`min-w-0 flex-1 font-semibold dp-text-ink ${q.kind === "meaning2word" ? "font-extrabold text-[#24406e]" : ""}`}>
                  {opt}
                </span>
                {correctOne && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0e9b78]" aria-hidden="true" />}
                {wrongOne && <XCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Correção */}
      {answered && (
        <div
          className={`dp-fade-up mt-3 rounded-2xl border p-3.5 ${
            isCorrect ? "border-[#bfe6d8] bg-[#e6f6f0]" : "border-red-200 bg-[#fdecec]"
          }`}
          role="status"
        >
          <p className={`text-sm font-extrabold ${isCorrect ? "text-[#0b7d61]" : "text-red-600"}`}>
            {isCorrect ? "Isso mesmo!" : "Caiu na pegadinha — atenção:"}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed dp-text-ink">
            <strong className="text-[#24406e]">{q.word}</strong>
            <span className="text-[#a08a77]"> → </span>
            {q.meaning}
            {q.word === "Prescindível" && (
              <>
                . <em>Prescindível</em> não é <em>imprescindível</em>: uma letra muda todo o sentido!
              </>
            )}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={next}
        disabled={!answered}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold transition ${
          answered
            ? "bg-[#0e9b78] text-white shadow-lg shadow-emerald-900/25 hover:brightness-110 active:scale-[0.99]"
            : "cursor-not-allowed bg-[#eef3ee] text-[#a7b3aa]"
        }`}
      >
        {current + 1 === questions.length ? "Ver resultado" : "Próxima pergunta"}
      </button>
    </section>
  );
}

function BlockCard({ block }: { block: VocabBlock }) {
  const [open, setOpen] = useState(block.id === 1);
  const t = THEME[block.theme];
  return (
    <article className="dp-card overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/70"
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${t.chip}`}
          aria-hidden="true"
        >
          {block.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#b09377]">
            Bloco {block.id}
          </span>
          <span className="block text-sm sm:text-[0.95rem] font-extrabold dp-text-ink">
            {block.title}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#a08a77] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className={`dp-fade-up border-t p-4 pt-3 ${t.ring} border-t-[#efe3d3]`}>
          <ul className="space-y-2">
            {block.items.map((item) => (
              <li
                key={item.word}
                className={`flex flex-col gap-0.5 rounded-xl px-3 py-2 sm:flex-row sm:items-baseline sm:gap-2 ${
                  item.highlight ? `${t.chip} ring-1 ${t.ring}` : "bg-[#fbf7f1]"
                }`}
              >
                <span className={`text-sm font-extrabold ${t.word} min-w-0`}>{item.word}</span>
                <span className="text-[#8a7462] sm:hidden">→</span>
                <span className="text-sm leading-snug dp-text-ink sm:flex-1">
                  <span className="hidden text-[#a08a77] sm:inline">→ </span>
                  {item.meaning}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

type TabMode = "blocos" | "treino";

export function VocabularyTab() {
  const [mode, setMode] = useState<TabMode>("blocos");

  return (
    <div className="dp-fade-up space-y-4">
      <section className="dp-card rounded-3xl p-5 sm:p-6" aria-label="Vocabulário Cebraspe">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e0f3ed] text-[#0e9b78]">
            <BookMarked className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold dp-text-ink">
            Vocabulário Cebraspe
          </h2>
        </div>
        <p className="mt-3 text-sm sm:text-[0.95rem] leading-relaxed dp-text-ink">
          O medo da Cebraspe não é o conteúdo da questão — é <strong>não entender o que a banca
          faz com as palavras</strong>. Existe um grupo de palavrinhas que a Cebraspe adora usar e
          que muda totalmente o sentido de uma frase. Quando elas aparecem no enunciado ou na
          alternativa, a pegadinha está quase sempre ali.
        </p>
        <p className="mt-2 text-sm sm:text-[0.95rem] leading-relaxed dp-text-ink">
          Prepare o print: aqui está a divisão por <strong>{VOCAB_BLOCKS.length} blocos</strong> (
          {TOTAL_WORDS} palavras) com o significado de cada uma — e um <strong>modo treino</strong>{" "}
          para fixar tudo antes da prova.
        </p>

        {/* Alternador de modo */}
        <div
          className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#fbf7f1] p-1.5"
          role="tablist"
          aria-label="Modo de estudo"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "blocos"}
            onClick={() => setMode("blocos")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${
              mode === "blocos"
                ? "bg-[#0e9b78] text-white shadow-md shadow-emerald-900/25"
                : "text-[#6f8a7e] hover:bg-white/80 hover:text-[#0e9b78]"
            }`}
          >
            <BookMarked className="h-4 w-4" aria-hidden="true" />
            Blocos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "treino"}
            onClick={() => setMode("treino")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${
              mode === "treino"
                ? "bg-[#0e9b78] text-white shadow-md shadow-emerald-900/25"
                : "text-[#6f8a7e] hover:bg-white/80 hover:text-[#0e9b78]"
            }`}
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Modo treino
          </button>
        </div>
      </section>

      {mode === "treino" ? (
        <QuizView onExit={() => setMode("blocos")} />
      ) : (
        <>
          <section className="space-y-2.5" aria-label="Blocos de vocabulário">
            <h3 className="px-1 text-sm font-black uppercase tracking-wide text-[#8a6a52]">
              As palavras que a banca adora
            </h3>
            {VOCAB_BLOCKS.map((block) => (
              <BlockCard key={block.id} block={block} />
            ))}
          </section>

          <section
            className="rounded-3xl border border-red-200/80 bg-gradient-to-br from-[#fdecec] to-[#fbdfdf] p-5"
            aria-label="A pegadinha clássica"
          >
            <h3 className="flex items-center gap-2 text-base font-extrabold dp-text-ink">
              <TriangleAlert className="h-5 w-5 text-red-500" aria-hidden="true" />
              A pegadinha clássica: prescindível × imprescindível
            </h3>
            <div className="mt-3 space-y-2.5">
              <div className="rounded-2xl bg-white/80 p-3.5 shadow-sm">
                <p className="text-sm leading-relaxed dp-text-ink">
                  <strong className="text-[#24406e]">Prescindível</strong> é o que{" "}
                  <strong>pode ser dispensado</strong>. <strong className="text-[#24406e]">Imprescindível</strong>{" "}
                  é o que <strong>não pode ser dispensado</strong> de jeito nenhum. Uma letra de
                  diferença — o sentido vira ao contrário.
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold dp-text-ink">Exemplo da banca</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecec] px-2 py-0.5 text-[11px] font-extrabold italic text-red-600">
                    <Quote className="h-3 w-3" aria-hidden="true" />
                    &quot;A vacinação é medida imprescindível para mitigar surtos.&quot;
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed dp-text-ink">
                  Se você leu <em>prescindível</em> (dispensável) onde estava escrito{" "}
                  <em>imprescindível</em>, errou a questão: leu o oposto do que a frase afirma. É
                  assim que uma palavra só executa a pegadinha inteira.
                </p>
              </div>
            </div>
          </section>

          <section className="dp-card rounded-3xl p-5" aria-label="Como usar com o Detector">
            <h3 className="flex items-center gap-2 text-base font-extrabold dp-text-ink">
              <ScanSearch className="h-5 w-5 text-[#0e9b78]" aria-hidden="true" />
              Como usar junto com o Detector
            </h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed dp-text-ink">
              <li>Antes de marcar, sublinhe no enunciado as palavras destes {VOCAB_BLOCKS.length} blocos.</li>
              <li>Substitua mentalmente a palavra pelo significado — o sentido muda?</li>
              <li>Mande a questão no Detector: quando essas palavras executam a pegadinha, elas aparecem citadas nos <strong>Operadores Semânticos</strong> da análise.</li>
              <li>Faça uma rodada do <strong>Modo treino</strong> por dia — 10 perguntas fixam o vocabulário rápido.</li>
              <li>Reveja este vocabulário na véspera da prova — é retenção rápida e de alto impacto.</li>
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
