"use client";

// Tela de carregamento da página (Task 25 → identidade visual oficial):
// aparece enquanto a página valida a sessão (AccountGate "checking") — ou
// seja, a cada carregamento do /app. Logotipo oficial centralizado sobre
// azul-marinho com brilhos discretos azul/dourado e barra de progresso
// animada (indeterminada e honesta: o carregamento é real, sem atraso
// artificial — o componente some quando o gate resolve).
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
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6"
      data-testid="loading-video"
      style={{
        background: "radial-gradient(120% 90% at 50% 0%, #0A1840 0%, #07152F 45%, #050D20 100%)",
      }}
    >
      {/* Brilhos discretos azul e dourado */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", width: "64vmin", height: "64vmin", borderRadius: "50%",
          top: "6%", left: "50%", transform: "translateX(-50%)", filter: "blur(10px)",
          background: "radial-gradient(circle, rgba(30,99,208,0.32) 0%, rgba(30,99,208,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute", width: "46vmin", height: "46vmin", borderRadius: "50%",
          bottom: "8%", left: "50%", transform: "translateX(-50%)", filter: "blur(12px)",
          background: "radial-gradient(circle, rgba(245,179,1,0.20) 0%, rgba(245,179,1,0) 70%)",
        }}
      />

      <div className="flex w-full flex-col items-center" style={{ maxWidth: 560 }}>
        {/* Logotipo oficial — object-fit contain, sem distorção; WebP com fallback */}
        <picture>
          <source srcSet="/brand/logo-pegadinhas.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-pegadinhas.png"
            alt=""
            aria-hidden="true"
            className="pc-loading-logo"
            style={{
              width: "100%", maxHeight: "52vh", objectFit: "contain",
              filter: "drop-shadow(0 16px 42px rgba(10, 24, 64, 0.9))",
            }}
          />
        </picture>

        {/* Barra de progresso animada (indeterminada — carregamento real) */}
        <div
          aria-hidden="true"
          className="pc-loading-bar"
          style={{
            marginTop: 26, width: "min(72vw, 320px)", height: 4, borderRadius: 999,
            background: "rgba(230, 237, 247, 0.12)", overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%", width: "100%", borderRadius: 999,
              background: "linear-gradient(90deg, #1E63D0 0%, #7FB2FF 55%, #F5B301 100%)",
              boxShadow: "0 0 12px rgba(127, 178, 255, 0.55)",
              animation: "pcLoadingBar 1400ms cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        </div>

        <p className="mt-5 text-sm font-extrabold" style={{ color: "#C9D4E8" }}>
          Verificando sua conta…
        </p>
      </div>

      <style>{`
        @keyframes pcLogoIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pc-loading-logo { animation: pcLogoIn 560ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes pcLoadingBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
