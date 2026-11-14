"use client";

// Seção de identidade visual da marca (landing) — usa a arte oficial
// integralmente, sem distorção (object-fit: contain) e com carregamento
// otimizado (lazy + decode assíncrono). Integração opcional na Landing,
// abaixo do hero — ver INTEGRACAO.md.

import { useEffect, useState } from "react";

export function BrandSection() {
  const [visible, setVisible] = useState(false);

  // Entrada suave só quando entra na viewport (IntersectionObserver — barato).
  useEffect(() => {
    const el = document.getElementById("marca-section");
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="marca-section" className="w-full px-4 py-10 sm:py-14" aria-label="Identidade visual da marca">
      <div className="mx-auto w-full" style={{ maxWidth: 720 }}>
        <div
          className="relative overflow-hidden rounded-3xl border"
          style={{
            borderColor: "rgba(245, 179, 1, 0.30)",
            background: "radial-gradient(120% 90% at 50% 0%, #0A1840 0%, #07152F 45%, #050D20 100%)",
            boxShadow: "0 24px 64px rgba(5, 13, 32, 0.55)",
          }}
        >
          {/* Brilhos azul e dourado discretos */}
          <div
            aria-hidden
            style={{
              position: "absolute", inset: "-20%", pointerEvents: "none",
              background:
                "radial-gradient(38% 32% at 28% 18%, rgba(30,99,208,0.28) 0%, rgba(30,99,208,0) 70%)," +
                "radial-gradient(30% 26% at 74% 82%, rgba(245,179,1,0.16) 0%, rgba(245,179,1,0) 70%)",
            }}
          />
          <div
            className="transition-all duration-700"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)" }}
          >
            {/* Arte oficial integral — contain, sem corte nem distorção; WebP + fallback */}
            <picture>
              <source srcSet="/brand/logo-pegadinhas.webp" type="image/webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-pegadinhas.png"
                alt="Pegadinhas dos Concursos — A pegadinha que a banca preparou, decifrada antes da prova!"
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
                style={{ objectFit: "contain" }}
              />
            </picture>
          </div>
        </div>
        <p
          className="mt-4 text-center text-[13px] leading-relaxed"
          style={{ color: "#8FA2C4" }}
        >
          A pegadinha que a banca preparou, decifrada <strong style={{ color: "#F5B301" }}>antes da prova</strong>.
        </p>
      </div>
    </section>
  );
}

export default BrandSection;
