"use client";

// Página de autenticação do usuário (/entrar): entrar ou criar conta.
// - Sessão via cookie HttpOnly assinado (POST /api/auth/login|register|logout,
//   GET /api/auth/session).
// - Se o e-mail tem compra aprovada (Purchase), o servidor devolve o MESMO
//   token de acesso pago junto com a sessão — salvamos no aparelho e a
//   plataforma (/app) abre direto, sem repetir o "Já paguei".
// - ?next=/caminho controla o destino após entrar (padrão: /app).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  ScanSearch,
  UserPlus,
} from "lucide-react";
import { PLAN_LABELS } from "@/lib/plans";
import { setStoredAccess, type StoredAccess } from "@/lib/accessStore";
import { trackAppOpen } from "@/lib/device";
import { SupportButton } from "@/components/landing/SupportButton";

interface SessionInfo {
  email: string;
  name: string | null;
  access: StoredAccess | null;
}

type Mode = "login" | "register";

const INPUT_CLASS =
  "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

export function AuthPage() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "info">("error");
  const [nextUrl, setNextUrl] = useState("/app");

  useEffect(() => {
    // ?next= com caminho interno apenas (evita open redirect).
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) setNextUrl(next);

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

  const submit = useCallback(async () => {
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register" ? { name, email, password } : { email, password }
        ),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        email?: string;
        name?: string | null;
        access?: StoredAccess | null;
      };
      if (res.ok && data.ok) {
        // Compra aprovada vinculada ao e-mail: guarda o acesso pago no aparelho.
        if (data.access) setStoredAccess(data.access);
        // Vincula a conta ao aparelho no painel (Usuários do app).
        try {
          trackAppOpen();
        } catch {}
        window.location.assign(nextUrl);
        return;
      }
      setMessageTone("error");
      setMessage(data.message ?? "Não foi possível continuar. Tente novamente em instantes.");
    } catch {
      setMessageTone("error");
      setMessage("Erro de conexão. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }, [mode, name, email, password, nextUrl]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // segue — o cookie será validado de novo na próxima navegação
    }
    setSession(null);
    setName("");
    setEmail("");
    setPassword("");
    setMessage(null);
  }, []);

  const canSubmit =
    email.includes("@") && email.includes(".") && password.length >= (mode === "register" ? 8 : 1);

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
              onClick={() => void logout()}
              className="mt-2.5 inline-flex w-full items-center justify-center rounded-xl border-2 border-[#e7d9c4] bg-white px-4 py-2.5 text-sm font-extrabold text-[#6f5b47] transition hover:bg-[#faf5ee]"
            >
              Sair da conta
            </button>
          </div>
        ) : (
          <div className="mt-6 dp-card rounded-3xl p-5">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#f3ead9] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage(null);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold transition ${
                  mode === "login"
                    ? "bg-white text-[#0b7d61] shadow-sm"
                    : "text-[#8a7462] hover:text-[#0b7d61]"
                }`}
                aria-pressed={mode === "login"}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setMessage(null);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold transition ${
                  mode === "register"
                    ? "bg-white text-[#0b7d61] shadow-sm"
                    : "text-[#8a7462] hover:text-[#0b7d61]"
                }`}
                aria-pressed={mode === "register"}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Criar conta
              </button>
            </div>

            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) void submit();
              }}
            >
              {mode === "register" && (
                <label className="block">
                  <span className="text-xs font-extrabold text-[#6f5b47]">Nome (opcional)</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Como quer ser chamado?"
                    autoComplete="name"
                    maxLength={80}
                    className={`mt-1 ${INPUT_CLASS}`}
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-extrabold text-[#6f5b47]">E-mail</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  className={`mt-1 ${INPUT_CLASS}`}
                />
              </label>

              <label className="block">
                <span className="text-xs font-extrabold text-[#6f5b47]">
                  {mode === "register" ? "Crie uma senha (mínimo 8 caracteres)" : "Senha"}
                </span>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#a08a77] transition hover:text-[#0b7d61]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {loading
                  ? mode === "login"
                    ? "Entrando…"
                    : "Criando conta…"
                  : mode === "login"
                    ? "Entrar"
                    : "Criar minha conta"}
              </button>
            </form>

            {message && (
              <p
                className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold leading-snug ${
                  messageTone === "error"
                    ? "bg-[#fdeeEA] text-[#c2472f]"
                    : "bg-[#f9ddc4] text-[#9a5b23]"
                }`}
                role="status"
              >
                {message}
              </p>
            )}

            <p className="mt-3 text-center text-xs font-semibold text-[#8a7462]">
              {mode === "login" ? (
                <>
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setMessage(null);
                    }}
                    className="font-extrabold text-[#0b7d61] underline decoration-2 underline-offset-2"
                  >
                    Criar agora
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setMessage(null);
                    }}
                    className="font-extrabold text-[#0b7d61] underline decoration-2 underline-offset-2"
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>

            <p className="mt-3 text-center text-[11px] font-semibold text-[#a08a77]">
              Precisa de ajuda? <SupportButton variant="link" label="Falar com o suporte" />
            </p>
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
