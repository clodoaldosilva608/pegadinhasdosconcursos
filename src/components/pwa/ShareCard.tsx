"use client";

// Cartão "Compartilhar com os amigos" — aparece após instalar o app
// (e também na tela de obrigado, após pagamento confirmado).
// O convite sai completo: banner, descrição e o link da aplicação.

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, ImageIcon, MessageCircle, Send, Share2 } from "lucide-react";
import {
  appUrl,
  copyInvite,
  nativeShare,
  shareBannerImage,
  shareDescription,
  telegramLink,
  whatsappLink,
} from "@/lib/share";

export function ShareCard({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [bannerState, setBannerState] = useState<"idle" | "sent" | "saved">("idle");

  const handleNative = async () => {
    const outcome = await nativeShare();
    if (outcome === "shared") setShared(true);
    if (outcome === "unsupported") {
      const ok = await copyInvite();
      setCopied(ok);
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
    <section
      className="dp-card rounded-2xl p-4 sm:p-5"
      aria-label="Compartilhar com os amigos"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-extrabold dp-text-ink leading-tight">
            Compartilhe com os amigos
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
            {compact
              ? "Quem estuda junto, passa junto. Mande o Detector para quem também está na batalha."
              : "Instalação concluída! Convide quem também está na batalha do concurso."}
          </p>
        </div>
      </div>

      {/* Prévia do convite: banner + descrição + link (como o amigo recebe) */}
      <div className="mt-3 rounded-2xl border border-[#f0e2cf] bg-[#fdf9f2] p-2.5">
        <p className="px-1 text-[10px] font-extrabold uppercase tracking-widest text-[#b3997f]">
          Prévia do convite · banner + descrição + link
        </p>
        <div className="mt-2 overflow-hidden rounded-xl border border-[#f0e2cf] bg-white shadow-sm">
          <Image
            src="/banner-share-v2.png"
            alt="Detetive com lupa — animação de apresentação do Detector de Pegadinhas"
            width={1200}
            height={630}
            className="h-auto w-full"
            sizes="(max-width: 640px) 100vw, 480px"
          />
        </div>
        <div className="mt-2 rounded-xl border border-[#f0e2cf] bg-white px-3 py-2.5">
          <p className="text-xs font-semibold leading-relaxed text-[#4c5f54]">
            {shareDescription()}
          </p>
          <p className="mt-1 break-all text-xs font-extrabold text-[#0b7d61]">{appUrl()}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 px-1">
          {[
            "Animação anexada",
            "Descrição pronta",
            "Link incluído",
          ].map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-[#e0f3ed] px-2 py-0.5 text-[10px] font-extrabold text-[#0b7d61]"
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={handleNative}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-3 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {shared ? "Enviado" : "Compartilhar"}
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
        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {bannerState === "sent"
          ? "Banner enviado!"
          : bannerState === "saved"
            ? "Banner salvo em downloads"
            : "Quero enviar só o banner (imagem)"}
      </button>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-[#b3997f]">
        No WhatsApp e no Telegram, o convite chega com a arte da animação como prévia do link.
      </p>
    </section>
  );
}
