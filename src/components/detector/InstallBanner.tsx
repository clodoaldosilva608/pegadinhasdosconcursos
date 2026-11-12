"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dp-pwa-dismissed";

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Inicialização adiada: evita setState síncrono no corpo do efeito.
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        // storage indisponível
      }
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      if (standalone) {
        setInstalled(true);
        return;
      }
      const ua = window.navigator.userAgent;
      const iOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsIOS(iOS);
    }, 0);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // idem
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } catch {
      // usuário cancelou ou o navegador bloqueou
    }
    setPromptEvent(null);
  };

  if (promptEvent) {
    return (
      <section
        className="dp-card flex items-center gap-3 rounded-2xl p-3"
        aria-label="Instalar aplicativo"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold dp-text-ink leading-tight">
            Instalar o Detector no aparelho
          </p>
          <p className="text-xs font-semibold text-[#8a7462] leading-tight">
            Abre como aplicativo, direto da tela inicial.
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-3.5 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Instalar
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar aviso de instalação"
          className="shrink-0 rounded-full p-1.5 text-[#a08a77] transition hover:bg-white/70"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    );
  }

  if (isIOS) {
    return (
      <section
        className="dp-card flex items-center gap-3 rounded-2xl p-3"
        aria-label="Adicionar à tela de início no iPhone"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold dp-text-ink leading-tight">
            Adicionar à Tela de Início
          </p>
          <p className="text-xs font-semibold text-[#8a7462] leading-tight">
            No Safari, toque em <strong className="dp-text-ink">Compartilhar</strong> e depois em{" "}
            <strong className="dp-text-ink">Adicionar à Tela de Início</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar aviso de instalação"
          className="shrink-0 rounded-full p-1.5 text-[#a08a77] transition hover:bg-white/70"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    );
  }

  return null;
}
