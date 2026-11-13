"use client";

// Portão de conta (/app) — Task 21: SEM cadastro não acessa a plataforma.
// Fluxo: sessão válida? → renderiza children (AccessGate decide paywall /
// lançamento grátis) : tela de entrada com AuthCard + benefícios da conta.
// Fornece UserSessionContext para o AccessGate personalizar o bloqueio pago
// (comprador com conta nunca vê "Já paguei" — o login já libera).

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, History, ScanSearch, Smartphone } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SupportButton } from "@/components/landing/SupportButton";
import { LoadingVideo } from "@/components/pwa/LoadingVideo";
import type { StoredAccess } from "@/lib/accessStore";

export interface UserSessionInfo {
  email: string;
  name: string | null;
  plan: string | null;
}

export const UserSessionContext = createContext<UserSessionInfo | null>(null);

export function useUserSession(): UserSessionInfo | null {
  return useContext(UserSessionContext);
}

export function AccountGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [session, setSession] = useState<UserSessionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await res.json()) as {
          loggedIn?: boolean;
          email?: string;
          name?: string | null;
          access?: StoredAccess | null;
        };
        if (!cancelled && data.loggedIn && data.email) {
          setSession({ email: data.email, name: data.name ?? null, plan: data.access?.plan ?? null });
          setState("open");
          return;
        }
      } catch {
        // sem sessão — bloqueia
      }
      if (!cancelled) setState("locked");
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <main className="dp-app-bg flex min-h-screen items-center justify-center">
        {/* Task 25: vídeo de carregamento a cada load da página (loop mudo). */}
        <LoadingVideo />
      </main>
    );
  }

  if (state === "locked") {
    return (
      <main className="dp-app-bg min-h-screen w-full">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-6 sm:px-6">
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
            <h1 className="text-xl font-black dp-text-ink">Acesse com sua conta</h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm font-semibold text-[#6f5b47] leading-relaxed">
              A plataforma é para estudantes cadastrados — assim seu progresso fica salvo e o
              acesso pago acompanha você em qualquer aparelho.
            </p>
            <ul className="mx-auto mt-3 flex max-w-sm flex-col gap-1.5 text-left">
              {[
                { icon: History, text: "Histórico com suas análises recentes" },
                { icon: Smartphone, text: "Trocou de celular? Só entrar de novo" },
                { icon: BellRing, text: "Lançamentos e cupons em primeira mão (opcional)" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e0f3ed] text-[#0b7d61]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-[#6f5b47]">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <AuthCard compact showLoggedState={false} />
          </div>

          <footer className="mt-auto pt-8 text-center">
            <p className="text-[11px] font-semibold text-[#a08a77]">
              Dúvidas? <SupportButton variant="link" label="Falar com o suporte" />
            </p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-[#bda38c]">
              Detector de Pegadinhas · Con-curso
            </p>
          </footer>
        </div>
      </main>
    );
  }

  return <UserSessionContext.Provider value={session}>{children}</UserSessionContext.Provider>;
}
