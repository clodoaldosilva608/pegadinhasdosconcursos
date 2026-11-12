// Neve em toda a página (Task 18): camada fixa que cobre a viewport inteira
// com flocos caindo — reusa os keyframes `dp-xmas-snow` da faixa natalina,
// mas com queda em altura de página (--dp-snow-fall em vh).
//
// - PRNG determinístico (mesma técnica da faixa): servidor e cliente geram os
//   mesmos flocos — sem mismatch de hidratação; componente puro, sem hooks.
// - aria-hidden + pointer-events-none: não atrapalha leitura nem cliques.
// - `prefers-reduced-motion` desliga (globals.css).
// - Ligada pelo painel: snowfall_page = auto (só dezembro) | on | off.

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

interface PageFlake {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

/** 42 flocos em toda a página (semente fixa ⇒ SSR idêntico ao cliente). */
const PAGE_FLAKES: PageFlake[] = (() => {
  const rnd = mulberry32(20261218);
  return Array.from({ length: 42 }, () => ({
    left: rnd() * 100,
    size: 2.5 + rnd() * 5,
    duration: 7 + rnd() * 8,
    delay: -rnd() * 15,
    drift: rnd() * 90 - 45,
    opacity: 0.35 + rnd() * 0.5,
  }));
})();

export function SnowfallOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
      data-testid="snowfall-page"
    >
      {PAGE_FLAKES.map((flake, i) => (
        <span
          key={`page-flake-${i}`}
          className="dp-xmas-flake dp-snow-page-flake absolute top-0 rounded-full bg-white"
          style={
            {
              left: `${flake.left}%`,
              width: flake.size,
              height: flake.size,
              "--dp-snow-duration": `${flake.duration}s`,
              "--dp-snow-delay": `${flake.delay}s`,
              "--dp-snow-drift": `${flake.drift}px`,
              "--dp-snow-fall": "108vh",
              "--dp-snow-opacity": flake.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
