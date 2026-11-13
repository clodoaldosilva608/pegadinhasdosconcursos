"use client";

// Vídeo de carregamento (Task 25): aparece enquanto a página valida a sessão
// (AccountGate "checking") — ou seja, a cada carregamento do /app. Loop mudo
// (autoplay com som é bloqueado pelo navegador e loading não deve narrar).
// prefers-reduced-motion: mantém o spinner tradicional.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function LoadingVideo() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setReduced(true);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  if (reduced) {
    return (
      <div className="flex items-center gap-2.5 text-[#6f5b47]">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <p className="text-sm font-extrabold">Verificando sua conta…</p>
      </div>
    );
  }

  return (
    <div className="relative flex w-full items-center justify-center" data-testid="loading-video">
      <video
        src="/loading.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="h-[70vh] max-h-[620px] w-auto object-contain"
        aria-hidden="true"
      />
      <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm font-extrabold text-[#f5efe6] drop-shadow">
        Verificando sua conta…
      </p>
    </div>
  );
}
