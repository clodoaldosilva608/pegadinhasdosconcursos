"use client";

// Vídeo de despedida exibido quando o usuário sai da conta (Task 24). O
// clique em "Sair da conta" é um gesto do usuário — a reprodução começa com
// áudio na maioria dos navegadores; se ainda assim for bloqueado, segue mudo
// e mostra o botão "Ativar narração" (o toque reinicia do começo).
// Ao terminar (ou se o vídeo não conseguir tocar), onFinish() continua o
// logout (reload → estado deslogado). Resguardos: 4s sem tocar ou teto de
// 13s (duração ≈10.03s + folga) encerram sem prender o usuário.

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

const GUARD_MS = 4000;
const HARD_CAP_MS = 13000;
const FADE_MS = 350;

export function ExitVideo({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"on" | "fade" | "off">("on");
  const [sound, setSound] = useState<"muted" | "prompt" | "on">("muted");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const capTimerRef = useRef<number | null>(null);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  }, []);

  const scheduleCap = useCallback(() => {
    if (capTimerRef.current !== null) window.clearTimeout(capTimerRef.current);
    capTimerRef.current = window.setTimeout(() => finish(), HARD_CAP_MS);
  }, [finish]);

  const startPlayback = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      await v.play();
      setSound("on");
      return;
    } catch {
      // política de autoplay: som exige gesto — segue mudo com botão
    }
    v.muted = true;
    try {
      await v.play();
      setSound("prompt");
    } catch {
      // vídeo não tocou (rede/erro) — encerra o overlay e segue o logout
      finish();
    }
  }, [finish]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => finish(), 0);
      return () => window.clearTimeout(t);
    }
    const guard = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || v.paused) finish();
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
  }, [scheduleCap, startPlayback, finish]);

  useEffect(() => {
    if (phase !== "fade") return;
    const t = window.setTimeout(() => setPhase("off"), FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

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
      setSound("muted");
    }
  }, [scheduleCap]);

  if (phase === "off") return null;

  return (
    <div
      aria-hidden={sound !== "prompt"}
      data-testid="exit-video"
      data-phase={phase}
      data-sound={sound}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#081224] transition-opacity ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <video
          ref={videoRef}
          src="/logout.mp4"
          playsInline
          preload="auto"
          className="h-full w-full object-cover sm:object-contain"
          onEnded={() => {
            setPhase("fade");
            finish();
          }}
          onError={() => {
            setPhase("fade");
            finish();
          }}
        />
        {sound === "prompt" && phase === "on" && (
          <button
            type="button"
            onClick={() => void enableSound()}
            data-testid="exit-sound-btn"
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
