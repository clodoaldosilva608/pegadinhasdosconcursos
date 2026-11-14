"use client";

// Splash de abertura da plataforma: a nova animação da marca roda em tela
// cheia e a duração é a da própria animação (~10s). Por trás, o app já
// carrega normalmente.
//
// Áudio (narração da personagem): navegadores só permitem som após um gesto
// do usuário. O splash TENTA tocar com som; se o navegador bloquear, segue
// mudo e mostra o botão "Ativar narração" — o toque reinicia a animação do
// começo com áudio. Resguardos: se o vídeo não conseguir tocar em 4s (rede
// lenta/erro), ou passar do teto, o splash sai sem travar.
// prefers-reduced-motion pula a animação direto.

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

const GUARD_MS = 4000; // vídeo ainda não carregou/tocou até aqui → sai
const HARD_CAP_MS = 12500; // teto absoluto (duração da animação + folga)
const FADE_MS = 350;
// Marca da abertura (Task 25): cookie de sessão (expira ao fechar o
// navegador). O page.tsx do /app lê no server e só monta o splash na
// PRIMEIRA carga da sessão — recarregamentos e o retorno pós-despedida do
// logout não repetem a animação.
const SPLASH_COOKIE = "splash=1; path=/";

export function SplashScreen() {
  const [phase, setPhase] = useState<"on" | "fade" | "off">("on");
  // "muted": autoplay mudo (som bloqueado e usuário ainda não clicou);
  // "prompt": botão de narração visível; "on": áudio tocando.
  const [sound, setSound] = useState<"muted" | "prompt" | "on">("muted");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const capTimerRef = useRef<number | null>(null);

  const scheduleCap = useCallback(() => {
    if (capTimerRef.current !== null) window.clearTimeout(capTimerRef.current);
    capTimerRef.current = window.setTimeout(() => setPhase("fade"), HARD_CAP_MS);
  }, []);

  // Tenta tocar com narração; sem permissão do navegador, cai para mudo e
  // oferece o botão (o toque do usuário libera o áudio).
  const startPlayback = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      await v.play();
      setSound("on"); // aparelho permitiu o som sozinho
      return;
    } catch {
      // política de autoplay: som exige gesto
    }
    v.muted = true;
    try {
      await v.play();
      setSound("prompt");
    } catch {
      // não conseguiu tocar nem mudo — o resguardo de 4s encerra o splash
    }
  }, []);

  useEffect(() => {
    try {
      document.cookie = SPLASH_COOKIE; // marca esta sessão como "abertura vista"
    } catch {
      // cookie bloqueado — o splash repetiria a cada load; aceitável
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setPhase("off"), 0);
      return () => window.clearTimeout(t);
    }
    const guard = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || v.paused) setPhase("fade"); // nunca começou a tocar
    }, GUARD_MS);
    scheduleCap();
    const v = videoRef.current;
    if (v) {
      if (v.readyState >= 2) {
        void startPlayback();
      } else {
        v.addEventListener("canplay", () => void startPlayback(), { once: true });
      }
    }
    return () => {
      window.clearTimeout(guard);
      if (capTimerRef.current !== null) window.clearTimeout(capTimerRef.current);
    };
  }, [scheduleCap, startPlayback]);

  useEffect(() => {
    if (phase !== "fade") return;
    const t = window.setTimeout(() => setPhase("off"), FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Botão de narração: gesto do usuário → áudio liberado; a animação volta ao
  // começo para a fala ser ouvida por inteiro, e o teto é reagendado.
  const enableSound = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      v.currentTime = 0;
      await v.play();
      setSound("on");
      scheduleCap();
    } catch {
      // mesmo com gesto não tocou — segue mudo, sem botão (não travar)
      setSound("muted");
    }
  }, [scheduleCap]);

  if (phase === "off") return null;

  return (
    <div
      aria-hidden={sound !== "prompt"}
      data-testid="splash-screen"
      data-phase={phase}
      data-sound={sound}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#050D20] transition-opacity ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <video
          ref={videoRef}
          src="/splash.mp4"
          playsInline
          preload="auto"
          className="h-full w-full object-cover sm:object-contain"
          onEnded={() => setPhase("fade")}
          onError={() => setPhase("fade")}
        />
        {sound === "prompt" && phase === "on" && (
          <button
            type="button"
            onClick={() => void enableSound()}
            data-testid="splash-sound-btn"
            className="absolute bottom-[22%] left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#f5b942] bg-white/90 px-4 py-2.5 text-xs font-extrabold text-[#0a1628] shadow-lg backdrop-blur transition hover:bg-white"
          >
            <Volume2 className="h-4 w-4 text-[#b8860b]" aria-hidden="true" />
            Ativar narração
          </button>
        )}
      </div>
    </div>
  );
}
