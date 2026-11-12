"use client";

// Faixa natalina da seção "A plataforma está 100% grátis até 01/01/2027":
// pisca-pisca no topo, neve caindo dentro do cartão e Papai Noel acenando
// (SVG puro + CSS, zero imagens/JS extra — leve e sem bloqueio de leitura).
//
// - Neve com posições determinísticas (PRNG com semente fixa): servidor e
//   cliente geram os mesmos flocos, sem mismatch de hidratação.
// - Decoração é aria-hidden e pointer-events-none; texto 1:1 o mesmo do
//   cartão original (a data vem da janela de lançamento no servidor).
// - `prefers-reduced-motion` desliga todas as animações (globals.css).
// - Pode ser desligada no painel admin: flag launch_christmas_enabled
//   (off = cartão simples de antes).

import { Bell } from "lucide-react";
import type { CSSProperties } from "react";

/** PRNG determinístico (mulberry32) — mesmos valores em SSR e cliente. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Flake {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  fall: number;
  opacity: number;
}

/** Flocos de neve: semente fixa ⇒ render idêntico em servidor e cliente. */
const FLAKES: Flake[] = (() => {
  const rnd = mulberry32(20261225);
  return Array.from({ length: 26 }, () => ({
    left: 2 + rnd() * 96,
    size: 2.5 + rnd() * 4.5,
    duration: 6.5 + rnd() * 6.5,
    delay: -rnd() * 13,
    drift: rnd() * 56 - 28,
    fall: 140 + rnd() * 80,
    opacity: 0.4 + rnd() * 0.55,
  }));
})();

/** Estrelinhas douradas fixas no fundo (cintilam via CSS). */
const STARS = [
  { left: "8%", top: "26%", size: 5, delay: "0s" },
  { left: "20%", top: "72%", size: 4, delay: "0.7s" },
  { left: "33%", top: "18%", size: 3, delay: "1.4s" },
  { left: "46%", top: "80%", size: 4, delay: "0.35s" },
  { left: "58%", top: "22%", size: 3, delay: "1.05s" },
  { left: "72%", top: "68%", size: 5, delay: "1.75s" },
  { left: "88%", top: "30%", size: 3, delay: "0.5s" },
];

const BULB_COLORS = ["#ff5f57", "#ffd166", "#3ddc84", "#4cc9f0", "#ff8fab"];

/** Papai Noel acenando — braço direito animado pela classe .dp-xmas-arm. */
function SantaWave({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 132" className={className} aria-hidden="true" focusable="false">
      <g className="dp-xmas-santa">
        {/* corpo (casaco vermelho com faixa branca e barra) */}
        <rect x="36" y="72" width="52" height="48" rx="18" fill="#c1121f" />
        <rect x="56" y="72" width="13" height="48" rx="6.5" fill="#fff6ea" />
        <rect x="38" y="110" width="48" height="10" rx="5" fill="#fff6ea" />
        {/* braço esquerdo apoiado + luva */}
        <rect x="24" y="80" width="24" height="11" rx="5.5" fill="#c1121f" />
        <circle cx="28" cy="93" r="6.5" fill="#fff6ea" />
        {/* braço direito erguido acenando (pivot no ombro) */}
        <g className="dp-xmas-arm">
          <rect x="88" y="56" width="11" height="32" rx="5.5" fill="#c1121f" />
          <circle cx="93.5" cy="60" r="5" fill="#fff6ea" />
          <circle cx="97" cy="51" r="6.5" fill="#fff6ea" />
        </g>
        {/* cabeça */}
        <circle cx="62" cy="46" r="17.5" fill="#f6c39e" />
        {/* barba fofa */}
        <ellipse cx="62" cy="60" rx="20" ry="15.5" fill="#ffffff" />
        <circle cx="47" cy="56" r="9" fill="#ffffff" />
        <circle cx="77" cy="56" r="9" fill="#ffffff" />
        {/* bigode */}
        <ellipse cx="55.5" cy="51.5" rx="7" ry="4" fill="#ffffff" transform="rotate(-12 55.5 51.5)" />
        <ellipse cx="68.5" cy="51.5" rx="7" ry="4" fill="#ffffff" transform="rotate(12 68.5 51.5)" />
        {/* rosto: olhos, bochechas, nariz */}
        <circle cx="55" cy="43" r="2.2" fill="#233028" />
        <circle cx="69" cy="43" r="2.2" fill="#233028" />
        <circle cx="50" cy="48.5" r="3" fill="#f2a08c" opacity="0.75" />
        <circle cx="74" cy="48.5" r="3" fill="#f2a08c" opacity="0.75" />
        <circle cx="62" cy="49.5" r="4" fill="#eb9f7f" />
        {/* gorro: curva + aba branca + pompom */}
        <path d="M46 33 Q52 8 78 20 L74 30 Q60 22 50 32 Z" fill="#c1121f" />
        <rect x="42" y="28" width="41" height="10" rx="5" fill="#ffffff" />
        <circle cx="82" cy="24" r="6.5" fill="#ffffff" />
      </g>
    </svg>
  );
}

/** Presente de canto (CSS puro, sem imagem). */
function GiftBox({ className, tone = "#c1121f" }: { className?: string; tone?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="relative h-7 w-8">
        <div className="absolute inset-x-0 bottom-0 h-[22px] rounded-[4px]" style={{ background: tone }} />
        <div className="absolute bottom-0 left-1/2 h-[22px] w-[5px] -translate-x-1/2 bg-[#ffd166]" />
        <div className="absolute inset-x-0 bottom-[16px] h-[5px] bg-[#ffd166]" />
        <div className="absolute bottom-[21px] left-1/2 h-[7px] w-[18px] -translate-x-1/2 rounded-t-full border-2 border-b-0 border-[#ffd166]" />
      </div>
    </div>
  );
}

export function ChristmasFreeBanner({
  freeUntilIso,
  enabled = true,
}: {
  freeUntilIso: string;
  enabled?: boolean;
}) {
  const dateLabel = freeUntilIso
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(freeUntilIso))
    : "01/01/2027";

  const festive = enabled;

  const content = (
    <>
      <p
        className={`text-sm font-extrabold ${festive ? "text-white" : "dp-text-ink"}`}
      >
        <Bell
          className={`mr-1.5 inline h-4 w-4 -translate-y-px ${
            festive ? "text-[#ffd166]" : "text-[#0b7d61]"
          }`}
          aria-hidden="true"
        />
        A plataforma está 100% grátis até {dateLabel}
      </p>
      <p
        className={`mx-auto mt-1 max-w-lg text-xs font-semibold leading-relaxed ${
          festive ? "text-[#f3e8d2]/85" : "text-[#6f5b47]"
        }`}
      >
        Ninguém precisa pagar durante o lançamento. Os planos abaixo são para quem quer
        garantir o acesso permanente — com preço de lançamento.
      </p>
    </>
  );

  // Decoração desligada (painel admin): cartão simples original.
  if (!enabled) {
    return <div className="dp-card mt-6 rounded-3xl p-4 text-center">{content}</div>;
  }

  return (
    <div
      className="relative mt-6 overflow-hidden rounded-3xl border border-[#3a7a5c]/50 shadow-[0_16px_44px_-16px_rgba(10,47,36,0.6)]"
      style={{ background: "linear-gradient(168deg, #11593f 0%, #0d4232 48%, #0a3025 100%)" }}
    >
      {/* brilho quente vindo do pisca-pisca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background:
            "radial-gradient(70% 100% at 50% 0%, rgba(255,209,102,0.24), transparent 72%)",
        }}
      />

      {/* estrelinhas cintilando */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {STARS.map((star, i) => (
          <span
            key={`star-${i}`}
            className="dp-xmas-twinkle absolute rounded-full bg-[#ffe9a8]"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* neve caindo dentro do cartão */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {FLAKES.map((flake, i) => (
          <span
            key={`flake-${i}`}
            className="dp-xmas-flake absolute top-0 rounded-full bg-white"
            style={
              {
                left: `${flake.left}%`,
                width: flake.size,
                height: flake.size,
                "--dp-snow-duration": `${flake.duration}s`,
                "--dp-snow-delay": `${flake.delay}s`,
                "--dp-snow-drift": `${flake.drift}px`,
                "--dp-snow-fall": `${flake.fall}px`,
                "--dp-snow-opacity": flake.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* pisca-pisca no topo (fio + lâmpadas) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0">
        <div className="mx-3 h-px bg-white/25 sm:mx-5" />
        <div className="mx-3 flex justify-between px-1 sm:mx-5">
          {Array.from({ length: 14 }, (_, i) => BULB_COLORS[i % BULB_COLORS.length]).map(
            (color, i) => (
            <span key={`bulb-${i}`} className="flex flex-col items-center">
              <span className="h-[3px] w-px bg-white/35" />
              <span
                className="dp-xmas-bulb block h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                style={{
                  background: color,
                  boxShadow: `0 0 9px 2px ${color}66`,
                  animationDelay: `${i * 0.23}s`,
                }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* presentes no canto esquerdo (a partir de sm — no mobile evitam
          sobrepor a linha "Presente de lançamento · Natal") */}
      <GiftBox className="pointer-events-none absolute bottom-2.5 left-4 hidden -rotate-6 opacity-90 sm:block" />
      <GiftBox
        className="pointer-events-none absolute bottom-1.5 left-11 hidden rotate-3 opacity-80 sm:left-12 sm:block"
        tone="#8a2be2"
      />

      {/* conteúdo + Papai Noel (flex evita sobreposição com o texto) */}
      <div className="relative flex items-end gap-2 px-4 pb-4 pt-7 sm:gap-3 sm:px-6 sm:pb-5">
        <div className="min-w-0 flex-1 px-2 text-center sm:px-0">
          {content}
          <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#ffd166]/90">
            Presente de lançamento · Natal
          </p>
        </div>
        <div className="relative w-16 shrink-0 sm:w-20">
          <span className="dp-xmas-bubble absolute -top-1 right-0 z-10 rounded-xl rounded-br-none bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#c1121f] shadow-md">
            Olá!
          </span>
          <SantaWave className="mt-4 h-auto w-full" />
        </div>
      </div>
    </div>
  );
}
