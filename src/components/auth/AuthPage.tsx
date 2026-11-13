"use client";

// Página de autenticação do usuário (/entrar): entrar ou criar conta.
// O card de formulário é o AuthCard (compartilhado com o AccountGate do /app).
// Sessão via cookie HttpOnly assinado; se o e-mail tem compra aprovada, o
// acesso pago acompanha a sessão e a plataforma abre em qualquer aparelho.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ScanSearch } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PLAN_LABELS } from "@/lib/plans";
import type { StoredAccess } from "@/lib/accessStore";

interface SessionInfo {
  email: string;
  name: string | null;
  access: StoredAccess | null;
}

export function AuthPage() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await res.json()) as {
          loggedIn?: boolean;
          email?: string;
          name?: string | null;
          access?: StoredAccess | null;
        };
        if (!cancelled && data.loggedIn && data.email) {
          setSession({ email: data.email, name: data.name ?? null, access: data.access ?? null });
        }
      } catch {
        // sem sessão — segue para o formulário
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

        {checking ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2.5 text-[#6f5b47]">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <p className="text-sm font-extrabold">Verificando sua sessão…</p>
            </div>
          </div>
        ) : session ? (
          <div className="mt-6 dp-card rounded-3xl p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e0f3ed] text-[#0b7d61] shadow-md">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-3 text-xl font-black dp-text-ink">
              {session.name ? `Olá, ${session.name}!` : "Você está conectado"}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6f5b47]">{session.email}</p>

            {session.access ? (
              <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e0f3ed] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#0b7d61]">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {PLAN_LABELS[session.access.plan] ?? "Acesso pago"} ativo
              </p>
            ) : (
              <p className="mx-auto mt-3 max-w-xs rounded-xl bg-[#f9ddc4] px-3.5 py-2 text-[11px] font-bold leading-snug text-[#9a5b23]">
                Conta conectada, sem compra aprovada neste e-mail ainda. Ao pagar, o acesso é
                liberado automaticamente em todos os aparelhos em que você entrar.
              </p>
            )}

            <Link
              href="/app"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
            >
              Ir para a plataforma
            </Link>
            <button
              type="button"
              onClick={() => {
                void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                setSession(null);
              }}
              className="mt-2.5 inline-flex w-full items-center justify-center rounded-xl border-2 border-[#e7d9c4] bg-white px-4 py-2.5 text-sm font-extrabold text-[#6f5b47] transition hover:bg-[#faf5ee]"
            >
              Sair da conta
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <AuthCard />
          </div>
        )}

        <footer className="mt-auto pt-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#bda38c]">
            Detector de Pegadinhas · Con-curso
          </p>
        </footer>
      </div>
    </main>
  );
}
