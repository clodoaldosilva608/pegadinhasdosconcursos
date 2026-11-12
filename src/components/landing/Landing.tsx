"use client";

// Landing page pública: o que é o Detector, como usar, planos (Pix/Cakto),
// botão de instalar (PWA) e compartilhar após a instalação.
//
// Páginas/elementos/funcionalidades gerenciáveis pelo painel admin
// (/admin → Site): textos do hero, seções visíveis, preços dos planos,
// janela de lançamento (data/ativação), cronômetro, nota do rodapé.
// O e-mail de suporte NÃO aparece aqui — só o botão "Suporte".

import Link from "next/link";
import {
  Bell,
  BookMarked,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  Gift,
  KeyRound,
  LogIn,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { InstallAndShare } from "@/components/pwa/InstallAndShare";
import { PlansSection } from "@/components/landing/PlansSection";
import { LeadForm } from "@/components/launch/LeadForm";
import { Countdown } from "@/components/launch/Countdown";
import { SupportButton } from "@/components/landing/SupportButton";
import type { PublicSiteConfig } from "@/lib/siteConfig";

const NAV = [
  { href: "#o-que-e", label: "O que é" },
  { href: "#como-usar", label: "Como usar" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "Dúvidas" },
];

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Detector de pegadinhas",
    text: "Mande a questão (print, foto ou texto), confirme o que marcou e receba a análise completa: onde está o distrator, por que ele engana e o que a banca quis te fazer errar — pelo Método 3C.",
  },
  {
    icon: BookOpen,
    title: "Guia de distratores",
    text: "Os tipos de pegadinha que a banca mais usa, com nome, definição e exemplo real: Conceito Vizinho, Meia-Verdade, Modalização Deôntica, Generalização Indevida e mais.",
  },
  {
    icon: BookMarked,
    title: "Vocabulário-armadilha",
    text: "Treino por blocos de palavras que disparam pegadinhas — “sempre”, “somente”, “cabe ao”, “é facultado” — com quiz para o seu cérebro aprender a desconfiar na hora da prova.",
  },
];

const STEPS = [
  {
    icon: Smartphone,
    title: "Instale o app",
    text: "Toque em “Instalar o app grátis” aqui na página. Ele fica na sua tela inicial e abre como aplicativo.",
  },
  {
    icon: Zap,
    title: "Escolha um plano e pague no Pix",
    text: "Passe de 30 dias ou vitalício. Pagamento processado pela Cakto e liberação automática quando o Pix é confirmado.",
  },
  {
    icon: KeyRound,
    title: "Conecte sua chave de IA (grátis)",
    text: "Um link dentro do app te leva ao Google AI Studio para criar uma chave gratuita. Ela fica só no seu aparelho — você usa a sua própria IA.",
  },
  {
    icon: Camera,
    title: "Mande a questão e descubra a pegadinha",
    text: "Cole o print da questão, confirme o gabarito e o que você marcou — e veja a análise decifrando cada alternativa.",
  },
];

const STEP_FREE = {
  icon: Zap,
  title: "Entre grátis — o acesso já está liberado",
  text: "Durante o lançamento, a plataforma abre sem pagar nada. Quer garantir para sempre? O vitalício segue com preço de lançamento.",
};

const FAQ = [
  {
    q: "Preciso pagar mais alguma coisa para a IA funcionar?",
    a: "Não. Você cria uma chave gratuita no Google AI Studio (o app te leva direto ao link) e a conecta no Detector. A chave fica somente no seu aparelho e é usada nas suas próprias análises.",
  },
  {
    q: "Como funciona a liberação depois do Pix?",
    a: "Quando a Cakto confirma o pagamento, o acesso é liberado automaticamente: na tela de obrigado o app já abre liberado. Se você sair do app, basta informar o e-mail da compra em “Já paguei” — a verificação é na hora.",
  },
  {
    q: "Por que está grátis? Vai continuar assim?",
    a: "É a estratégia de lançamento: acesso 100% grátis até 01/01/2027, com cronômetro na página. Depois dessa data o acesso volta a ser por plano (Pix, via Cakto). Quem quiser travar o preço e garantir o acesso permanente já pode comprar o vitalício.",
  },
  {
    q: "Funciona no iPhone?",
    a: "Sim. No Safari, toque no ícone de Compartilhar e escolha “Adicionar à Tela de Início”. O app passa a abrir como aplicativo, em tela cheia.",
  },
  {
    q: "Posso pedir reembolso?",
    a: "Sim. Por lei (CDC, art. 49) você tem até 7 dias após a compra para pedir reembolso direto na plataforma de pagamento.",
  },
  {
    q: "Serve para qualquer banca?",
    a: "O foco é o estilo Cespe/Cebraspe — assertivas, distratores com meia-verdade e operadores semânticos — mas a análise também ajuda em questões de outras bancas.",
  },
  {
    q: "O Detector é oficial de alguma banca ou órgão?",
    a: "Não. É um produto independente de estudos, sem qualquer vínculo com a CEBRASPE, com bancas ou com órgãos públicos.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0e9b78]">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-2xl font-black dp-text-ink sm:text-3xl">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm font-semibold text-[#6f5b47] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export function Landing({
  cfg,
  launchFree,
  freeUntilIso,
}: {
  cfg: PublicSiteConfig;
  launchFree: boolean;
  freeUntilIso: string;
}) {
  const on = (key: string) => (cfg[key] ?? "1") !== "0";
  const heroTitle = cfg.hero_title ?? "";
  const heroSubtitle = cfg.hero_subtitle ?? "";
  const heroBullets = (cfg.hero_bullets ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const badge = cfg.launch_badge ?? "";
  const countdownOn = on("launch_countdown_enabled");
  const steps = launchFree ? STEPS.map((s, i) => (i === 1 ? STEP_FREE : s)) : STEPS;

  return (
    <main className="dp-app-bg min-h-screen w-full">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/40 bg-[#fdf3e6]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md shadow-emerald-900/20"
              style={{ background: "linear-gradient(135deg, #14b98d 0%, #0b7d61 100%)" }}
              aria-hidden="true"
            >
              <ScanSearch className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold dp-text-ink">Detector de Pegadinhas</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a6a52]">
                Con-curso
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-5 md:flex" aria-label="Seções da página">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-bold text-[#6f5b47] transition hover:text-[#0b7d61]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/app"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#233028] px-4 py-2 text-xs font-extrabold text-white shadow-md transition hover:bg-[#31423a]"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            {launchFree && badge && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#0e9b78] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-emerald-900/20">
                <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                {badge}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0e9b78]/25 bg-[#e0f3ed] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0b7d61]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Feito para concurseiros
            </span>
            <h1 className="mt-3 text-3xl font-black leading-tight dp-text-ink sm:text-4xl md:text-[2.6rem]">
              {heroTitle}
            </h1>
            <p className="mt-3 max-w-lg text-[15px] font-semibold text-[#6f5b47] leading-relaxed">
              {heroSubtitle}
            </p>
            <div className="mt-5">
              <InstallAndShare />
            </div>
            {launchFree && countdownOn && (
              <div className="mt-5 inline-block rounded-2xl border border-[#0e9b78]/25 bg-[#e0f3ed]/70 px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0b7d61]">
                  O acesso grátis termina em
                </p>
                <div className="mt-2">
                  <Countdown untilIso={freeUntilIso} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-[#6f5b47]">
                  Depois disso, o acesso volta a ser por plano (Pix) — quem já está dentro
                  aproveita até o fim.
                </p>
              </div>
            )}
            {heroBullets.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
                {heroBullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#6f5b47]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0e9b78]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Prévia ilustrativa */}
          <div className="dp-card rounded-3xl p-4 shadow-xl shadow-amber-900/10 sm:p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#b3997f]">
              Exemplo ilustrativo de análise
            </p>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#4c5f54]">
              “O servidor investido em cargo em comissão <span className="dp-trap-hl">sempre</span>{" "}
              poderá optar pela remuneração do cargo efetivo.”
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[#fdeeEA] px-2.5 py-1 text-[11px] font-extrabold text-[#c2472f]">
                Distrator: Generalização (“sempre”)
              </span>
              <span className="rounded-full bg-[#f9ddc4] px-2.5 py-1 text-[11px] font-extrabold text-[#9a5b23]">
                Operador: universalização indevida
              </span>
              <span className="rounded-full bg-[#e0f3ed] px-2.5 py-1 text-[11px] font-extrabold text-[#0b7d61]">
                3C por letra: Certo por outro caso
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {[
                { letter: "A", state: "trap", text: "Regra real de outro caso — a cauda erra" },
                { letter: "B", state: "ok", text: "Gabarito: regra válida para a hipótese" },
                { letter: "C", state: "trap", text: "Troca “poderá” por “deverá”" },
              ].map((opt) => (
                <div
                  key={opt.letter}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 ${
                    opt.state === "ok"
                      ? "border-[#0e9b78]/40 bg-[#e0f3ed]/60"
                      : "border-[#f2d9c8] bg-[#fdeeEA]/40"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${
                      opt.state === "ok" ? "bg-[#0e9b78]" : "bg-[#e25744]"
                    }`}
                  >
                    {opt.letter}
                  </span>
                  <p className="text-[12px] font-semibold text-[#4c5f54] leading-snug">{opt.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] font-bold text-[#a08a77]">
              É exatamente assim que o Detector conta a história da questão para você.
            </p>
          </div>
        </div>
      </section>

      {/* O que é */}
      {on("section_features") && (
        <section id="o-que-e" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-10 sm:px-6">
          <SectionHeading
            eyebrow="O que é"
            title="Três ferramentas contra as pegadinhas da banca"
            subtitle="Tudo em um só aplicativo, feito para o estilo de prova que cobica detalhes."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="dp-card rounded-3xl p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e0f3ed] text-[#0e9b78]">
                  <feature.icon className="h-5.5 w-5.5" strokeWidth={2.2} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-base font-extrabold dp-text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-[13px] font-semibold text-[#6f5b47] leading-relaxed">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Como usar */}
      {on("section_steps") && (
        <section id="como-usar" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-10 sm:px-6">
          <SectionHeading
            eyebrow="Como usar"
            title={launchFree ? "Grátis agora: do instante à primeira análise em minutos" : "Do Pix à primeira análise em poucos minutos"}
          />
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step.title} className="dp-card flex items-start gap-3 rounded-3xl p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#17b98c] to-[#0b7d61] text-sm font-black text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-sm font-extrabold dp-text-ink">
                    <step.icon className="h-4 w-4 text-[#0e9b78]" aria-hidden="true" />
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold text-[#6f5b47] leading-relaxed">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Avisos (funil de captação com consentimento LGPD) */}
      {on("section_leads") && (
        <section id="avisos" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10 sm:px-6">
          <SectionHeading
            eyebrow="Fique por dentro"
            title={cfg.leads_title ?? ""}
            subtitle={cfg.leads_subtitle ?? ""}
          />
          <div className="dp-card mx-auto mt-6 max-w-xl rounded-3xl p-5">
            <LeadForm source="landing" />
          </div>
        </section>
      )}

      {/* Planos */}
      {on("section_plans") && (
        <section id="planos" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10 sm:px-6">
          <SectionHeading
            eyebrow="Planos"
            title="Escolha o seu acesso"
            subtitle="Pagamento no Pix processado pela Cakto. Liberação automática na confirmação."
          />
          {launchFree && (
            <div className="dp-card mt-6 rounded-3xl p-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-sm font-extrabold dp-text-ink">
                <Bell className="h-4 w-4 text-[#0e9b78]" aria-hidden="true" />
                A plataforma está 100% grátis até {freeUntilIso ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(freeUntilIso)) : "01/01/2027"}
              </p>
              <p className="mx-auto mt-1 max-w-lg text-xs font-semibold text-[#6f5b47] leading-relaxed">
                Ninguém precisa pagar durante o lançamento. Os planos abaixo são para quem quer
                garantir o acesso permanente — com preço de lançamento.
              </p>
            </div>
          )}
          <div className="mt-6">
            <PlansSection
              priceOverrides={{
                pass30: cfg.plans_pass30_price,
                lifetime: cfg.plans_lifetime_price,
                anchor: cfg.plans_lifetime_anchor,
              }}
            />
          </div>
        </section>
      )}

      {/* FAQ */}
      {on("section_faq") && (
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10 sm:px-6">
          <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes" />
          <div className="mt-6 space-y-2.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="dp-card group rounded-2xl px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold dp-text-ink">
                  {item.q}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-[#0e9b78] transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-2 text-[13px] font-semibold text-[#6f5b47] leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-6 border-t border-[#f0e2cf] bg-[#fdf3e6]/70 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #14b98d 0%, #0b7d61 100%)" }}
                aria-hidden="true"
              >
                <ScanSearch className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <p className="text-sm font-extrabold dp-text-ink">Detector de Pegadinhas · Con-curso</p>
            </div>
            <p className="max-w-xl text-xs font-semibold text-[#8a6a52] leading-relaxed">
              {cfg.footer_note ?? ""}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-extrabold">
              {on("section_plans") && (
                <>
                  <a href="#planos" className="text-[#0b7d61] hover:underline">
                    Planos
                  </a>
                  <span className="text-[#d9c8b4]">·</span>
                </>
              )}
              {on("section_faq") && (
                <>
                  <a href="#faq" className="text-[#0b7d61] hover:underline">
                    Dúvidas
                  </a>
                  <span className="text-[#d9c8b4]">·</span>
                </>
              )}
              {/* Botão de suporte — o e-mail não fica visível na página */}
              <SupportButton variant="link" label="Suporte" />
              <span className="text-[#d9c8b4]">·</span>
              <Link
                href="/admin"
                className="text-[#bda38c] transition hover:text-[#0b7d61] hover:underline"
              >
                Admin
              </Link>
            </div>
            <p className="text-[11px] font-semibold text-[#cbb5a0]">
              Estude pela questão · Conheça a banca · Aprofunde o conteúdo pelo gabarito
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
