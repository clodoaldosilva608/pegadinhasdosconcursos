"use client";

// Splash de abertura da plataforma: a nova animação da marca roda em tela
// cheia e a duração é a da própria animação (~10s). Por trás, o app já
// carrega normalmente. Resguardos: se o vídeo não conseguir tocar em 4s
// (rede lenta/erro), ou passar do teto de 12.5s, o splash sai sem travar.
// prefers-reduced-motion pula a animação direto.

import { useEffect, useRef, useState } from "react";

const GUARD_MS = 4000; // vídeo ainda não carregou/tocou até aqui → sai
const HARD_CAP_MS = 12500; // teto absoluto (duração da animação + folga)
const FADE_MS = 350;

export function SplashScreen() {
  const [phase, setPhase] = useState<"on" | "fade" | "off">("on");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setPhase("off"), 0);
      return () => window.clearTimeout(t);
    }
    const guard = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) setPhase("fade"); // nunca começou a tocar
    }, GUARD_MS);
    const hardCap = window.setTimeout(() => setPhase("fade"), HARD_CAP_MS);
    return () => {
      window.clearTimeout(guard);
      window.clearTimeout(hardCap);
    };
  }, []);

  useEffect(() => {
    if (phase !== "fade") return;
    const t = window.setTimeout(() => setPhase("off"), FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "off") return null;

  return (
    <div
      aria-hidden="true"
      data-testid="splash-screen"
      data-phase={phase}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#081224] transition-opacity ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover sm:object-contain"
        onEnded={() => setPhase("fade")}
        onError={() => setPhase("fade")}
      />
    </div>
  );
}
