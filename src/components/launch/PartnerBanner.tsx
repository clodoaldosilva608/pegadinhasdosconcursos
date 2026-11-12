"use client";

// Banner de cross-promo da plataforma parceira DestravaStudy (Task 18):
// logomarca com halo dourado, selo "Plataforma parceira" e botão de acesso
// pulsando. Aparece na landing e no dashboard (/app); textos, URL e logo são
// editáveis no painel admin (aba Site → "Plataforma parceira").

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { PartnerConfig } from "@/lib/siteConfig";

export function PartnerBanner({ partner }: { partner: PartnerConfig }) {
  return (
    <section
      className="dp-card relative overflow-hidden rounded-3xl p-5"
      aria-label={`Plataforma parceira: ${partner.title}`}
      data-testid="partner-banner"
    >
      {/* halo dourado atrás da logomarca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-14 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(242,193,78,0.35), transparent 70%)" }}
      />
      <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
        <span className="relative shrink-0">
          <span
            aria-hidden="true"
            className="absolute inset-0 -m-1.5 rounded-2xl"
            style={{ boxShadow: "0 0 0 2px rgba(242,193,78,0.55), 0 0 28px 6px rgba(242,193,78,0.35)" }}
          />
          <img
            src={partner.logo}
            alt={`Logomarca ${partner.title}`}
            width={72}
            height={72}
            className="relative h-16 w-16 rounded-2xl border border-[#f2c14e]/60 object-cover shadow-md sm:h-[72px] sm:w-[72px]"
          />
        </span>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#f2c14e] to-[#d9a83a] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#3a2c05] shadow-sm">
            ★ {partner.label}
          </span>
          <h3 className="mt-1.5 text-base font-black dp-text-ink leading-tight">{partner.title}</h3>
          <p className="mt-1 text-[13px] font-semibold text-[#6f5b47] leading-snug">{partner.text}</p>
        </div>

        <a
          href={partner.url}
          target="_blank"
          rel="noopener noreferrer"
          className="dp-pulse relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#f2c14e] to-[#c9962e] px-5 py-3 text-sm font-black text-[#3a2c05] shadow-lg shadow-amber-900/25 transition hover:from-[#ffd166] hover:to-[#d9a83a]"
        >
          {partner.cta}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

// Versão para o dashboard (/app): busca o estado do banner em /api/launch
// (mesma fonte do portão de acesso) e renderiza quando habilitado no painel.
// Fetch próprio (uma chamada leve por montagem) evita perfurar props até o
// HomeView, que vive dentro da árvore do DetectorApp.
export function PartnerBannerClient() {
  const [partner, setPartner] = useState<PartnerConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/launch", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { partner?: PartnerConfig };
        if (!cancelled && data.partner?.enabled) setPartner(data.partner);
      } catch {
        // banner é opcional: falha silenciosa
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  if (!partner) return null;
  return (
    <div className="dp-fade-up">
      <PartnerBanner partner={partner} />
    </div>
  );
}
