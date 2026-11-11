"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Crosshair, Quote } from "lucide-react";

const DISTRATOR_TYPES = [
  {
    name: "Conceito Vizinho",
    emoji: "🎭",
    definition:
      "Reproduz corretamente uma regra REAL, porém de outra situação ou hipótese legal do que a que o enunciado descreve. Você lembra da regra, mas esquece de conferir se ela vale para o caso da questão.",
    example:
      "A alternativa diz que o servidor eleito 'deverá ficar afastado do cargo'. Essa regra existe (art. 38, § 1º, CF), mas vale para mandato SEM compatibilidade de horários. Se o enunciado fala em horários compatíveis, o conceito é vizinho, não é o caso.",
  },
  {
    name: "Parcialdade / Meia-Verdade (Erro de Cauda)",
    emoji: "🧩",
    definition:
      "A frase começa certa e erra no final — ou o contrário. O candidato lê o início, reconhece a regra e marca sem conferir a cauda da assertiva.",
    example:
      "'Poderá se manter no cargo, sendo-lhe facultado optar pela remuneração.' Manter o cargo está certo; a opção pela remuneração vale para outro caso. O erro mora no fim da frase.",
  },
  {
    name: "Modalização Deôntica",
    emoji: "⚖️",
    definition:
      "Troca o verbo ou o modificador que define o regime jurídico: deverá / poderá / será / é obrigatório / é facultativo / cabe. A mudança de um verbo altera todo o direito aplicado.",
    example:
      "'O verbo \"deverá\" impõe um afastamento obrigatório que a Constituição não exige quando os horários são compatíveis.' O conteúdo é quase todo verdadeiro; o verbo executa a pegadinha.",
  },
  {
    name: "Pressuposição Categórica",
    emoji: "🕳️",
    definition:
      "Insere um fato ou condição como se fosse óbvio e certo, sem o enunciado sustentar. O resto da frase, verdadeiro, faz o candidato aceitar esse início sem conferir.",
    example:
      "'No caso de afastamento, os valores serão determinados como se…' A condição pressupõe um afastamento que não acontece com o candidato do enunciado.",
  },
  {
    name: "Generalização / Universalização Indevida",
    emoji: "🌐",
    definition:
      "Usa termos absolutos — 'sempre', 'nunca', 'todos', 'somente', 'em qualquer hipótese' — para estender a regra além do alcance dela.",
    example:
      "'O tempo de serviço será contado para todos os efeitos legais, exceto…' O 'todos' e o 'exceto' estreitam ou ampliam a regra real.",
  },
  {
    name: "Exceção Disfarçada",
    emoji: "🚪",
    definition:
      "Omite uma exceção que mudaria a resposta, ou inventa uma exceção que não existe no texto legal.",
    example:
      "A regra vale 'salvo', 'exceto', 'ressalvado' — a banca esconde a ressalva ou cria uma falsa para te derrubar.",
  },
  {
    name: "Inversão Causal",
    emoji: "🔄",
    definition:
      "Troca causa e efeito, ou inverte quem pratica a ação descrita na norma. A frase parece simétrica à regra, mas está espelhada.",
    example:
      "'O servidor será afastado para exercer mandato' versus 'afastado porque exerce mandato' — a ordem dos fatos muda o regime.",
  },
  {
    name: "Atribuição de Competência Errada",
    emoji: "🏛️",
    definition:
      "Desloca a competência para outro órgão, entidade ou esfera. O procedimento descrito existe, mas pertence a outro responsável.",
    example:
      "'O Senado aprovará o regimento…' quando quem aprova é outro órgão. Quem faz o quê é a pegadinha.",
  },
];

const OPERATOR_EXAMPLES = [
  {
    name: "Modalização Deôntica",
    quote: "deverá ficar afastado",
    effect:
      "O verbo impõe obrigatoriedade onde a norma prevê possibilidade — ou vice-versa. Sempre confira o verbo antes do conteúdo.",
  },
  {
    name: "Pressuposição Categórica",
    quote: "no caso de afastamento",
    effect:
      "A condição escondida no meio da frase supõe uma situação que o enunciado excluiu.",
  },
  {
    name: "Universalização",
    quote: "para todos os efeitos legais",
    effect:
      "A expressão de amplitude total ampla demais: compare com o alcance real da norma.",
  },
  {
    name: "Exclusão disfarçada",
    quote: "exceto para promoção por merecimento",
    effect:
      "O 'exceto' na cauda da frase cria (ou apaga) uma exceção que decide a questão.",
  },
];

function TypeCard({ item }: { item: (typeof DISTRATOR_TYPES)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="dp-card overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-xl" aria-hidden="true">
          {item.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm sm:text-[0.95rem] font-extrabold dp-text-ink">
            {item.name}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-xs font-semibold text-[#8a7462]">
            {item.definition}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#a08a77] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="dp-fade-up border-t border-[#efe3d3] p-4 pt-3">
          <p className="text-sm leading-relaxed dp-text-ink">{item.definition}</p>
          <div className="mt-3 rounded-xl bg-[#fdf6ec] p-3">
            <p className="flex items-start gap-1.5 text-xs font-black uppercase tracking-wide text-[#b45309]">
              <Crosshair className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Exemplo clássico
            </p>
            <p className="mt-1 text-sm leading-relaxed dp-text-ink">{item.example}</p>
          </div>
        </div>
      )}
    </article>
  );
}

export function DistractorsTab() {
  return (
    <div className="dp-fade-up space-y-4">
      <section className="dp-card rounded-3xl p-5 sm:p-6" aria-label="O que são distratores">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e0f3ed] text-[#0e9b78]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold dp-text-ink">O que são distratores?</h2>
        </div>
        <p className="mt-3 text-sm sm:text-[0.95rem] leading-relaxed dp-text-ink">
          Distrator é a alternativa errada construída de propósito para <em>parecer</em> correta.
          As bancas não erram por acaso: elas usam receitas conhecidas — um conceito verdadeiro de
          outra situação, uma meia-verdade, um verbo trocado, uma condição escondida. Quem conhece
          essas receitas para de &quot;achar&quot; a resposta e passa a <strong>enxergar</strong> a
          armadilha antes de marcar.
        </p>
        <p className="mt-2 text-sm sm:text-[0.95rem] leading-relaxed dp-text-ink">
          Aqui no Detector de Pegadinhas, cada análise classifica os distratores da sua questão no
          <strong> Método 3C</strong> (Conteúdo, Distrator utilizado e Operador Semântico) e aponta
          os operadores semânticos: a palavra, o verbo, o prefixo ou o conector que executa a
          pegadinha.
        </p>
      </section>

      <section className="space-y-2.5" aria-label="Tipos de distratores">
        <h3 className="px-1 text-sm font-black uppercase tracking-wide text-[#8a6a52]">
          Catálogo de pegadinhas
        </h3>
        {DISTRATOR_TYPES.map((item) => (
          <TypeCard key={item.name} item={item} />
        ))}
      </section>

      <section
        className="rounded-3xl border border-[#f2c48d]/70 bg-gradient-to-br from-[#fdf1de] to-[#fbe6c8] p-5"
        aria-label="Operadores semânticos"
      >
        <h3 className="text-base font-extrabold dp-text-ink">
          Operadores semânticos: o gatilho da pegadinha
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed dp-text-ink">
          A palavra, o verbo, o prefixo ou o conector que executa a pegadinha nem sempre é o
          conteúdo. Veja operadores reais capturados pelo Detector:
        </p>
        <ul className="mt-3 space-y-2.5">
          {OPERATOR_EXAMPLES.map((op) => (
            <li key={op.name} className="rounded-2xl bg-white/80 p-3.5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold dp-text-ink">{op.name}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf1de] px-2 py-0.5 text-[11px] font-extrabold italic text-[#b45309]">
                  <Quote className="h-3 w-3" aria-hidden="true" />
                  &quot;{op.quote}&quot;
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed dp-text-ink">{op.effect}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="dp-card rounded-3xl p-5" aria-label="Como treinar">
        <h3 className="text-base font-extrabold dp-text-ink">Como treinar com o Detector</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed dp-text-ink">
          <li>Resolva a questão como se estivesse na prova e marque sua resposta.</li>
          <li>Mande o print no Detector e confirme o gabarito e a sua marcação.</li>
          <li>Leia &quot;Por que você errou&quot; antes do Método 3C — o impacto emocional fixa o aprendizado.</li>
          <li>Guarde os operadores semânticos da questão: eles reaparecem em outras bancas.</li>
          <li>Leia a Dica para a prova e refaça a questão em 48h para consolidar.</li>
        </ol>
      </section>
    </div>
  );
}
