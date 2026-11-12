"use client";

// Convite compacto dentro da plataforma (/app): incentiva quem já usa a
// divulgar entre amigos e redes sociais — sem a prévia grande do ShareCard.

import { useState } from "react";
import { Check, Copy, HeartHandshake, MessageCircle, Send, Share2 } from "lucide-react";
import {
  copyInvite,
  nativeShare,
  shareBannerImage,
  telegramLink,
  whatsappLink,
} from "@/lib/share";

export function MiniShare() {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [bannerState, setBannerState] = useState<"idle" | "sent" | "saved">("idle");

  const handleNative = async () => {
    const outcome = await nativeShare();
    if (outcome === "shared") setShared(true);
    if (outcome === "unsupported") {
      const ok = await copyInvite();
      setCopied(ok);
      if (ok) window.setTimeout(() => setCopied(false), 4000);
    }
  };

  const handleCopy = async () => {
    const ok = await copyInvite();
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 4000);
  };

  const handleBanner = async () => {
    const outcome = await shareBannerImage();
    if (outcome === "shared") setBannerState("sent");
    if (outcome === "downloaded") {
      setBannerState("saved");
      window.setTimeout(() => setBannerState("idle"), 4000);
    }
  };

  return (
    <section className="dp-card rounded-2xl p-4" aria-label="Convidar amigos">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
          <HeartHandshake className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold dp-text-ink leading-tight">
            Convide um amigo concurseiro
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
            Quem estuda junto passa junto: mande o Detector para quem também está na batalha —
            um convite seu pode salvar meses de estudo de alguém.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={handleNative}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-3 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {shared ? "Enviado!" : "Compartilhar"}
        </button>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25d366] px-3 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-900/15 transition hover:bg-[#1fb857]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp
        </a>
        <a
          href={telegramLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#229ed9] px-3 py-2.5 text-xs font-extrabold text-white shadow-md shadow-sky-900/15 transition hover:bg-[#1c8bc0]"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Telegram
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c8b4] bg-white/80 px-3 py-2.5 text-xs font-extrabold text-[#6f5b47] transition hover:bg-white"
        >
          {copied ? (
            <Check className="h-4 w-4 text-[#0e9b78]" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? "Convite copiado" : "Copiar convite"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleBanner}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#0e9b78]/40 bg-white/60 px-3 py-2 text-[11px] font-extrabold text-[#0b7d61] transition hover:bg-[#e0f3ed]/50"
      >
        {bannerState === "sent"
          ? "Banner enviado!"
          : bannerState === "saved"
            ? "Banner salvo em downloads"
            : "Enviar só o banner (imagem)"}
      </button>
    </section>
  );
}
