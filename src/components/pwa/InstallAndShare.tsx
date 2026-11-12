"use client";

// Botão principal de instalação (PWA) da página inicial.
// Fluxo pedido: clicou em Instalar → instalação concluída → aparece o
// cartão para compartilhar com os amigos.

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import Link from "next/link";
import { ShareCard } from "@/components/pwa/ShareCard";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAndShare() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [otherBrowser, setOtherBrowser] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Inicialização adiada: evita setState síncrono no corpo do efeito.
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);

      const ua = window.navigator.userAgent;
      setIsIOS(
        /iPad|iPhone|iPod/.test(ua) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      );
      // Firefox e alguns desktops não disparam beforeinstallprompt.
      const chromeLike = /Chrome|Chromium|Edg|OPR/.test(ua) && !/Firefox/.test(ua);
      setOtherBrowser(!standalone && !chromeLike && !/iPad|iPhone|iPod/.test(ua));
    }, 0);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setJustInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setJustInstalled(true);
    } catch {
      // usuário cancelou
    }
    setPromptEvent(null);
  };

  if (isStandalone) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Link
          href="/app"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
        >
          <Smartphone className="h-4.5 w-4.5" aria-hidden="true" />
          Abrir a plataforma
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
        {promptEvent ? (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
          >
            <Download className="h-4.5 w-4.5" aria-hidden="true" />
            Instalar o app grátis
          </button>
        ) : isIOS ? (
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#233028] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg">
            <Download className="h-4.5 w-4.5" aria-hidden="true" />
            No Safari: Compartilhar → Adicionar à Tela de Início
          </span>
        ) : (
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
          >
            <Smartphone className="h-4.5 w-4.5" aria-hidden="true" />
            Abrir a plataforma
          </Link>
        )}
        <Link
          href="#planos"
          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0e9b78]/35 bg-white/70 px-6 py-3 text-sm font-extrabold text-[#0b7d61] transition hover:bg-white"
        >
          Ver planos
        </Link>
      </div>

      {isIOS && (
        <p className="text-xs font-semibold text-[#8a7462]">
          No iPhone o passo final é manual: toque no ícone de Compartilhar do Safari e escolha
          “Adicionar à Tela de Início”.
        </p>
      )}
      {otherBrowser && !promptEvent && (
        <p className="text-xs font-semibold text-[#8a7462]">
          Dica: para instalar como aplicativo, abra este site no Chrome e use o menu ⋮ →
          “Instalar aplicativo”.
        </p>
      )}

      {justInstalled && <ShareCard />}
    </div>
  );
}
