"use client";

// Banner de instalação do PWA (Task 22) — usado na landing e no /app.
// - Android/desktop: captura beforeinstallprompt e instala com 1 clique.
// - iOS: não há prompt nativo — mostra como "Adicionar à Tela de Início".
// - Some se o app já está instalado (display-mode: standalone) ou se o usuário
//   dispensou (14 dias no localStorage).

import { useCallback, useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "dp-install-dismissed-at";
const DISMISS_DAYS = 14;

type Phase = "hidden" | "native" | "ios";

function isStandalone(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    return (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ se apresenta como Mac com toque
  return (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Já instalado ou dispensado recentemente → o banner NÃO deve aparecer. */
function shouldHide(): boolean {
  if (isStandalone()) return true;
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 3600 * 1000) return true;
  } catch {
    // storage bloqueado — segue
  }
  return false;
}

const COPY = {
  landing: {
    title: "Instale o Pegadinhas dos Concursos no seu celular",
    subtitle: "Acesso direto pela tela de início, em tela cheia e sem loja de apps.",
  },
  app: {
    title: "Instale o app no seu celular",
    subtitle: "Abra o Detector direto da tela de início — mais rápido que o navegador.",
  },
} as const;

export function InstallBanner({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const copy = COPY[variant];

  useEffect(() => {
    let cancelled = false;

    const onInstallPrompt = (event: Event) => {
      // Toma posse do evento e guarda para o botão "Instalar".
      event.preventDefault();
      // A dispensa fala mais alto que o evento (o Chrome re-dispara BIP a cada
      // navegação — quem fechou o banner não quer vê-lo de novo).
      if (cancelled || shouldHide()) return;
      setPromptEvent(event as BeforeInstallPromptEvent);
      setPhase("native");
    };
    const onInstalled = () => {
      if (cancelled) return;
      setPromptEvent(null);
      setPhase("hidden");
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => {
      if (cancelled) return;
      if (shouldHide()) return; // já instalado ou dispensado — nunca mostra
      if (isIos()) setPhase("ios");
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage bloqueado — some só nesta sessão
    }
    setPhase("hidden");
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setPhase("hidden"); // appinstalled também dispara; por garantia
      }
    } catch {
      // usuário fechou o diálogo nativo — banner fica
    }
  }, [promptEvent]);

  if (phase === "hidden") return null;

  return (
    <div
      className="dp-card relative rounded-2xl p-4 shadow-md"
      data-testid="install-banner"
      data-phase={phase}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar banner de instalação"
        className="absolute right-2 top-2 rounded-lg p-1.5 text-[#a08a77] transition hover:bg-[#faf5ee] hover:text-[#6f5b47]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#07152F] shadow-md"
          style={{ background: "linear-gradient(135deg, #FFD54A 0%, #F5B301 100%)" }}
          aria-hidden="true"
        >
          <Smartphone className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1 pr-5">
          <h3 className="text-sm font-extrabold leading-tight dp-text-ink">{copy.title}</h3>
          {phase === "native" ? (
            <>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-[#6f5b47]">
                {copy.subtitle}
              </p>
              <button
                type="button"
                onClick={() => void install()}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD54A] to-[#F5B301] px-4 py-2.5 text-sm font-extrabold text-[#07152F] shadow-md shadow-amber-900/20 transition hover:from-[#FFE27A] hover:to-[#FFC61A]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Instalar app
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs font-semibold leading-snug text-[#6f5b47]">
              No iPhone: toque no botão{" "}
              <Share2 className="inline h-3.5 w-3.5 -translate-y-px text-[#0b7d61]" aria-hidden="true" />{" "}
              <strong className="font-extrabold text-[#233028]">Compartilhar</strong> do Safari e
              escolha{" "}
              <strong className="font-extrabold text-[#233028]">
                “Adicionar à Tela de Início”
              </strong>
              . O app fica igual a um aplicativo, em tela cheia.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
