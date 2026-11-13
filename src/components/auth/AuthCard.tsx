"use client";

// Card de autenticação (abas Entrar / Criar conta) — reutilizável pela página
// /entrar e pelo AccountGate (cadastro obrigatório para acessar /app).
// - LGPD: opt-in de promoções/lançamentos NÃO pré-marcado, com timestamp.
// - Sucesso: se o e-mail tem compra aprovada, guarda o token de acesso pago
//   (setStoredAccess) e vincula a conta ao aparelho (trackAppOpen).

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { setStoredAccess, type StoredAccess } from "@/lib/accessStore";
import { trackAppOpen } from "@/lib/device";
import { SupportButton } from "@/components/landing/SupportButton";

type Mode = "login" | "register";

const INPUT_CLASS =
  "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

interface AuthCardProps {
  /** Nota curta de contexto (usado no bloqueio de conta do /app). */
  compact?: boolean;
  /** /entrar mostra o estado conectado; o AccountGate já validou a sessão. */
  showLoggedState?: boolean;
}

export function AuthCard({ compact = false, showLoggedState = true }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "info">("error");

  const submit = useCallback(async () => {
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { name, email, password, marketingConsent: consent }
            : { email, password }
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
        // Compra aprovada vinculada ao e-mail: acesso pago vai junto.
        if (data.access) setStoredAccess(data.access);
        // Vincula a conta ao aparelho no painel (Usuários do app).
        try {
          trackAppOpen();
        } catch {}
        // Em /app o AccountGate já está montado (bloqueado): router.push para a
        // MESMA rota não o remonta — um reload re-avalia a sessão. De /entrar,
        // navegação client normal.
        if (window.location.pathname === "/app") {
          window.location.reload();
        } else {
          router.push("/app");
        }
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
  }, [mode, name, email, password, consent, router]);

  const canSubmit =
    email.includes("@") && email.includes(".") && password.length >= (mode === "register" ? 8 : 1);

  return (
    <div className="dp-card rounded-3xl p-5">
      {compact && (
        <p className="mb-3 rounded-xl bg-[#f9ddc4] px-3 py-2 text-[11px] font-bold leading-snug text-[#9a5b23]">
          Para acessar a plataforma, entre com sua conta — é rápido e gratuito.
        </p>
      )}

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

        {mode === "register" && (
          <label className="flex items-start gap-2 rounded-xl bg-[#faf5ee] px-3 py-2.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e9b78]"
            />
            <span className="text-[11px] font-semibold text-[#6f5b47] leading-snug">
              Quero receber avisos de lançamentos, cupons e promoções do Con-curso por e-mail.
              Sem custo, cancele quando quiser.
            </span>
          </label>
        )}

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
  );
}
