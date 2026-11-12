"use client";

// Cronômetro regressivo do lançamento (até 01/01/2027).
// Renderiza placeholders no SSR e acerta no cliente — sem risco de
// mismatch de hidratação.

import { useEffect, useState } from "react";

interface Parts {
  d: number;
  h: number;
  m: number;
  s: number;
  over: boolean;
}

function partsFrom(untilMs: number, nowMs: number): Parts {
  const diff = untilMs - nowMs;
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff / 3_600_000) % 24),
    m: Math.floor((diff / 60_000) % 60),
    s: Math.floor((diff / 1_000) % 60),
    over: false,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({
  untilIso,
  onOver,
  size = "lg",
}: {
  untilIso: string;
  onOver?: () => void;
  size?: "lg" | "sm";
}) {
  const untilMs = new Date(untilIso).getTime();
  const [now, setNow] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    let cancelled = false;
    const kick = window.setTimeout(() => {
      if (!cancelled) setNow(Date.now());
    }, 0);
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= untilMs) {
        setOver(true);
        onOver?.();
        window.clearInterval(timer);
      }
    }, 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(kick);
      window.clearInterval(timer);
    };
  }, [untilMs, onOver]);

  if (over) return null;

  const p = now === null ? null : partsFrom(untilMs, now);
  const digits =
    size === "lg"
      ? "text-2xl sm:text-3xl"
      : "text-sm";
  const box =
    size === "lg"
      ? "min-w-[64px] rounded-2xl px-3 py-2"
      : "min-w-[44px] rounded-lg px-1.5 py-1";
  const label = size === "lg" ? "text-[9px]" : "text-[8px]";

  const cells: Array<[string, string]> = [
    [p ? pad(p.d) : "––", p ? (p.d === 1 ? "dia" : "dias") : "dias"],
    [p ? pad(p.h) : "––", "horas"],
    [p ? pad(p.m) : "––", "min"],
    [p ? pad(p.s) : "––", "seg"],
  ];

  return (
    <div
      className="flex items-stretch gap-1.5 sm:gap-2"
      role="timer"
      aria-label="Tempo restante do lançamento gratuito"
    >
      {cells.map(([value, name]) => (
        <div
          key={name}
          className={`${box} flex flex-col items-center rounded-2xl border border-[#0e9b78]/25 bg-white/80 shadow-sm`}
        >
          <span className={`${digits} font-black tabular-nums leading-none text-[#0b7d61]`}>
            {value}
          </span>
          <span className={`${label} mt-1 font-extrabold uppercase tracking-widest text-[#8a7462]`}>
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
