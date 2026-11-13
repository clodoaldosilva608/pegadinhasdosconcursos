"use client";

// Portão de acesso pago da plataforma (/app).
// - Sem token válido: mostra a tela de bloqueio com planos + "Já paguei".
// - Com token válido: renderiza a plataforma (children).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, LockKeyhole, LogIn, MailCheck, ScanSearch } from "lucide-react";
import { PlansSection } from "@/components/landing/PlansSection";
import { RecoveryBanner } from "@/components/landing/RecoveryBanner";
import { InstallBanner } from "@/components/detector/InstallBanner";
import { ShareCard } from "@/components/pwa/ShareCard";
import { LeadForm } from "@/components/launch/LeadForm";
import { LaunchStrip } from "@/components/launch/LaunchStrip";
import { SnowfallOverlay } from "@/components/launch/SnowfallOverlay";
import { SupportButton } from "@/components/landing/SupportButton";
import { trackAppOpen } from "@/lib/device";
import { LAUNCH_DEADLINE_LABEL, LAUNCH_FREE_UNTIL_ISO, isLaunchFreeNow } from "@/lib/launch";
import { useUserSession } from "@/components/access/AccountGate";
import {
  clearStoredAccess,
  getStoredAccess,
  setStoredAccess,
  verifyAccessRemote,
  type StoredAccess,
} from "@/lib/accessStore";

type GateState = "checking" | "locked" | "open";

function VerifyBox({ onUnlocked }: { onUnlocked: (access: StoredAccess) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "info">("error");

  const verify = useCallback(
    async (value: string, silent = false) => {
      const target = value.trim();
      if (!target) {
        if (!silent) setMessage("Digite o e-mail que você usou na compra.");
        return;
      }
      setLoading(true);
      if (!silent) setMessage(null);
      try {
        const res = await fetch("/api/access/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: target }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          token?: string;
          plan?: string;
          email?: string;
          expiresAt?: string;
          message?: string;
        };
        if (res.ok && data.ok && data.token) {
          const access: StoredAccess = {
            token: data.token,
            email: data.email ?? target.toLowerCase(),
            plan: data.plan ?? "lifetime",
            expiresAt: data.expiresAt ?? "",
          };
          setStoredAccess(access);
          onUnlocked(access);
          return;
        }
        setMessageTone("info");
        setMessage(data.message ?? "Não consegui verificar agora. Tente novamente em instantes.");
      } catch {
        setMessageTone("error");
        setMessage("Erro de conexão. Tente novamente em instantes.");
      } finally {
        setLoading(false);
      }
    },
    [onUnlocked]
  );

  return (
    <div className="dp-card rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
          <MailCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-extrabold dp-text-ink leading-tight">Já paguei</h3>
          <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
            Informe o e-mail usado no pagamento do Pix. O acesso é liberado na hora neste aparelho.
          </p>
        </div>
      </div>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(email);
        }}
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu@email.com"
          aria-label="E-mail da compra"
          className="flex-1 rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? "Verificando…" : "Liberar acesso"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-2.5 rounded-xl px-3 py-2 text-xs font-bold leading-snug ${
            messageTone === "error"
              ? "bg-[#fdeeEA] text-[#c2472f]"
              : "bg-[#f9ddc4] text-[#9a5b23]"
          }`}
          role="status"
        >
          {message}
        </p>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#a08a77]">
        Problemas?
        <SupportButton variant="link" label="Falar com o suporte" />
      </p>
    </div>
  );
}

function LockedView({
  onUnlocked,
  deadlineLabel,
  recoveryEnabled,
  festive,
}: {
  onUnlocked: (access: StoredAccess) => void;
  deadlineLabel: string;
  recoveryEnabled: boolean;
  /** Temporada natalina: selo/botão "Presente de Natal" nos planos. */
  festive: boolean;
}) {
  // Sessão vem do AccountGate (contexto) — com conta, o card vira confirmação.
  const session = useUserSession();
  return (
    <main className="dp-app-bg min-h-screen w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-10 pt-6 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md shadow-emerald-900/20"
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
          </Link>
          <Link
            href="/"
            className="text-xs font-extrabold text-[#0b7d61] underline decoration-2 underline-offset-2"
          >
            Página inicial
          </Link>
        </header>

        <div className="mt-6 dp-card rounded-3xl p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#233028] text-white shadow-lg">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-xl font-black dp-text-ink">Conteúdo exclusivo</h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm font-semibold text-[#6f5b47] leading-relaxed">
            O período de lançamento gratuito (encerrado em {deadlineLabel}) acabou. O
            Detector completo — análise de questões, guia de distratores e vocabulário-armadilha
            — é liberado com o pagamento do Pix. Escolha um plano abaixo ou, se já pagou, use o
            “Já paguei” com o e-mail da compra.
          </p>
          <p className="mx-auto mt-2 flex max-w-sm items-center justify-center gap-1.5 text-[11px] font-bold text-[#9a5b23]">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Já estudou grátis no lançamento? O vitalício garante acesso permanente.
          </p>
        </div>

        <div className="mt-4">
          <div className="dp-card rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
                <LogIn className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                {session ? (
                  <>
                    <h3 className="text-base font-extrabold dp-text-ink leading-tight">
                      Conta conectada
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
                      {session.email} — se este for o e-mail da sua compra, o acesso é liberado
                      automaticamente ao entrar. Não é você?{" "}
                      <Link
                        href="/entrar"
                        className="font-extrabold text-[#0b7d61] underline decoration-2 underline-offset-2"
                      >
                        Trocar conta
                      </Link>
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-extrabold dp-text-ink leading-tight">
                      Entrar com minha conta
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
                      E-mail e senha. Se você já comprou, o acesso é liberado neste aparelho na
                      hora — sem repetir o “Já paguei”. Trocou de celular? Só entrar de novo.
                    </p>
                  </>
                )}
              </div>
            </div>
            {!session && (
              <Link
                href="/entrar"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0e9b78] bg-white px-4 py-2.5 text-sm font-extrabold text-[#0b7d61] transition hover:bg-[#e0f3ed]"
              >
                Entrar / Criar conta
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4">
          <RecoveryBanner enabled={recoveryEnabled} />
        </div>

        <div className="mt-4">
          <PlansSection compact festive={festive} />
        </div>

        <div className="mt-4">
          <VerifyBox onUnlocked={onUnlocked} />
        </div>

        <div className="mt-4">
          <div className="dp-card rounded-3xl p-5">
            <h3 className="text-sm font-extrabold dp-text-ink">Avisos e ofertas em primeira mão</h3>
            <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
              Entre na lista para receber cupons e novidades — e saberem primeiro quando o
              lançamento volta.
            </p>
            <div className="mt-3">
              <LeadForm source="gate" compact />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <InstallBanner />
        </div>

        <div className="mt-4">
          <ShareCard compact />
        </div>

        <footer className="mt-auto pt-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#bda38c]">
            Detector de Pegadinhas · Con-curso
          </p>
        </footer>
      </div>
    </main>
  );
}

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [launchFree, setLaunchFree] = useState(false);
  const [freeUntil, setFreeUntil] = useState(LAUNCH_FREE_UNTIL_ISO);
  const [deadlineLabel, setDeadlineLabel] = useState(LAUNCH_DEADLINE_LABEL);
  const [recoveryEnabled, setRecoveryEnabled] = useState(true);
  const [festive, setFestive] = useState(false);
  const [snowActive, setSnowActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // Um microtask para não setar estado sincronamente no corpo do efeito.
      await Promise.resolve();
      if (cancelled) return;
      // Task 18: cada aparelho que abre o app aparece no painel (Usuários do app).
      trackAppOpen();
      // Lançamento/paywall: decisão pelo servidor (config do painel); fallback no relógio local.
      let free = false;
      try {
        const res = await fetch("/api/launch", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            launchFree?: boolean;
            freeUntil?: string;
            freeUntilLabel?: string;
            paywallEnabled?: boolean;
            recoveryBannerEnabled?: boolean;
            christmasSeason?: boolean;
            snowfallActive?: boolean;
          };
          free = data.launchFree === true || data.paywallEnabled === false;
          if (data.freeUntil) setFreeUntil(data.freeUntil);
          if (data.freeUntilLabel) setDeadlineLabel(data.freeUntilLabel);
          if (typeof data.recoveryBannerEnabled === "boolean") {
            setRecoveryEnabled(data.recoveryBannerEnabled);
          }
          // Task 18 — Natal + neve (sempre decidido no servidor)
          if (typeof data.christmasSeason === "boolean") setFestive(data.christmasSeason);
          if (typeof data.snowfallActive === "boolean") setSnowActive(data.snowfallActive);
        }
      } catch {
        free = false;
      }
      if (!free) free = isLaunchFreeNow();
      if (cancelled) return;
      if (free) {
        setLaunchFree(true);
        setState("open");
        return;
      }
      const stored = getStoredAccess();
      if (!stored) {
        setState("locked");
        return;
      }
      const ok = await verifyAccessRemote(stored.token);
      if (cancelled) return;
      if (!ok) clearStoredAccess();
      setState(ok ? "open" : "locked");
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <main className="dp-app-bg flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 text-[#6f5b47]">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <p className="text-sm font-extrabold">Verificando seu acesso…</p>
        </div>
      </main>
    );
  }

  if (state === "open") {
    return (
      <>
        {snowActive && <SnowfallOverlay />}
        {children}
        {launchFree && <LaunchStrip freeUntil={freeUntil} />}
      </>
    );
  }

  return (
    <>
      {snowActive && <SnowfallOverlay />}
      <LockedView
        onUnlocked={() => {
          setState("open");
          window.scrollTo({ top: 0 });
        }}
        deadlineLabel={deadlineLabel}
        recoveryEnabled={recoveryEnabled}
        festive={festive}
      />
    </>
  );
}

export { VerifyBox };
