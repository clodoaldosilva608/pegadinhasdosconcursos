"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  clearUserAi,
  getUserAi,
  getUserAiServerSnapshot,
  saveUserAi,
  subscribeUserAi,
  type UserAiProvider,
} from "@/lib/userAiStore";

interface TestResult {
  ok: boolean;
  message: string;
}

const PROVIDERS: Record<
  UserAiProvider,
  { label: string; short: string; link: string; linkLabel: string; hint: string }
> = {
  google: {
    label: "Google AI Studio (Gemini · grátis)",
    short: "Google AI Studio",
    link: "https://aistudio.google.com/apikey",
    linkLabel: "Criar chave grátis no AI Studio",
    hint: 'Chaves novas começam com "AQ." — copie a chave completa',
  },
  zai: {
    label: "Z.ai (GLM)",
    short: "Z.ai",
    link: "https://z.ai/manage-apikey/apikey-list",
    linkLabel: "Criar chave na plataforma Z.ai",
    hint: 'Na página "API Keys", clique em Create API Key e copie a chave completa',
  },
};

function maskKey(key: string): string {
  if (key.length <= 12) return key.slice(0, 4) + "…";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export function AiKeySection() {
  const saved = useSyncExternalStore(subscribeUserAi, getUserAi, getUserAiServerSnapshot);
  const [serverAi, setServerAi] = useState<boolean | null>(null);
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState<UserAiProvider>("google");
  const [input, setInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/ai-status")
      .then((r) => r.json())
      .then((d: { serverAi?: boolean }) => {
        if (alive) setServerAi(d.serverAi === true);
      })
      .catch(() => {
        if (alive) setServerAi(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const startEditing = () => {
    setProvider(saved?.provider ?? "google");
    setInput(saved?.key ?? "");
    setResult(null);
    setEditing(true);
  };

  const handleSaveAndTest = async () => {
    const key = input.trim();
    setResult(null);
    if (!key) {
      setResult({ ok: false, message: "Cole a chave para continuar." });
      return;
    }
    if (provider === "google" && !/^(AIza|AQ\.)/.test(key)) {
      setResult({
        ok: false,
        message:
          'Chaves do Google AI Studio começam com "AIza" (formato antigo) ou "AQ." (formato novo). Confira se copiou a chave completa.',
      });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; sample?: string };
      if (data.ok) {
        saveUserAi({ provider, key });
        setEditing(false);
        setResult({
          ok: true,
          message: `Chave válida${data.sample ? ` · a IA respondeu: "${data.sample}"` : ""}`,
        });
      } else {
        setResult({ ok: false, message: data.error ?? "A IA recusou essa chave." });
      }
    } catch {
      setResult({ ok: false, message: "Erro de conexão ao validar a chave. Tente de novo." });
    } finally {
      setTesting(false);
    }
  };

  const handleTestSaved = async () => {
    if (!saved) return;
    setResult(null);
    setTesting(true);
    try {
      const res = await fetch("/api/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: saved.provider, key: saved.key }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; sample?: string };
      if (data.ok) {
        setResult({
          ok: true,
          message: `Chave válida${data.sample ? ` · a IA respondeu: "${data.sample}"` : ""}`,
        });
      } else {
        setResult({ ok: false, message: data.error ?? "A IA recusou essa chave." });
      }
    } catch {
      setResult({ ok: false, message: "Erro de conexão ao validar a chave. Tente de novo." });
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = () => {
    clearUserAi();
    setEditing(false);
    setResult(null);
  };

  const chipBase =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold";

  return (
    <section
      className="dp-card space-y-3 rounded-2xl p-4"
      aria-label="Sua chave de IA"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#24406e]/10 text-[#24406e]">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold dp-text-ink">Sua chave de IA</p>
            <p className="text-xs font-semibold text-[#8a7462] leading-tight">
              {saved
                ? `Conectada · ${PROVIDERS[saved.provider].short}`
                : serverAi
                  ? "IA do servidor ativa · usar a sua é opcional"
                  : "Conecte uma chave grátis para analisar"}
            </p>
          </div>
        </div>
        <span
          className={`${chipBase} shrink-0 ${
            saved
              ? "bg-[#e0f3ed] text-[#0e9b78]"
              : serverAi === false
                ? "bg-[#fdf3e3] text-[#b25e00]"
                : "bg-white/70 text-[#6f8a7e]"
          }`}
        >
          {saved ? "conectada" : serverAi === false ? "precisa de chave" : serverAi === null ? "…" : "servidor ok"}
        </span>
      </div>

      {result && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs font-bold ${
            result.ok
              ? "border-[#bfe6d6] bg-[#eaf7f2] text-[#0b7d61]"
              : "border-[#f3cfc5] bg-[#fdeeEA] text-[#b03a24]"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="leading-snug">{result.message}</span>
        </div>
      )}

      {saved && !editing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#e4d2bf] bg-white/70 px-3 py-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#0e9b78]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#6f8a7e]">
              {maskKey(saved.key)}
            </span>
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="text-[11px] font-extrabold text-[#24406e] hover:underline"
              aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}
            >
              {showKey ? "ocultar" : "mostrar"}
            </button>
          </div>
          {showKey && (
            <p className="break-all rounded-xl bg-white/60 px-3 py-2 font-mono text-[11px] text-[#8a7462]">
              {saved.key}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestSaved}
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4f8] px-3 py-1.5 text-xs font-extrabold text-[#24406e] transition hover:bg-[#e0ecf4] disabled:opacity-60"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Testar novamente
            </button>
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4f8] px-3 py-1.5 text-xs font-extrabold text-[#24406e] transition hover:bg-[#e0ecf4]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Trocar chave
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#fdeeEA] px-3 py-1.5 text-xs font-extrabold text-[#b03a24] transition hover:bg-[#fbdcd3]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remover
            </button>
          </div>
        </div>
      )}

      {!saved && !editing && serverAi === true && (
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4f8] px-3 py-1.5 text-xs font-extrabold text-[#24406e] transition hover:bg-[#e0ecf4]"
        >
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Usar minha própria chave (opcional)
        </button>
      )}

      {(editing || (!saved && serverAi === false)) && (
        <div className="space-y-3">
          {!saved && (
            <p className="text-xs font-semibold leading-relaxed text-[#8a7462]">
              A análise por IA usa a <strong className="text-[#24406e]">sua própria chave</strong>: crie
              uma grátis, cole aqui e a análise roda com a sua conta. A chave fica salva{" "}
              <strong className="text-[#24406e]">apenas no seu navegador</strong> — não é enviada para
              nenhum lugar além da execução das suas análises.
            </p>
          )}

          <div className="flex flex-wrap gap-2" role="group" aria-label="Escolher provedor da chave">
            {(Object.keys(PROVIDERS) as UserAiProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                aria-pressed={provider === p}
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                  provider === p
                    ? "bg-[#0e9b78] text-white shadow-md shadow-emerald-900/20"
                    : "bg-white/70 text-[#6f8a7e] hover:bg-white"
                }`}
              >
                {PROVIDERS[p].short}
                {p === "google" ? " · grátis" : ""}
              </button>
            ))}
          </div>

          <ol className="space-y-1.5 text-xs font-semibold text-[#8a7462]">
            <li className="flex items-start gap-2">
              <span className="font-black text-[#0e9b78]">1.</span>
              <a
                href={PROVIDERS[provider].link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-extrabold text-[#0e9b78] underline decoration-[#0e9b78]/40 underline-offset-2 hover:decoration-[#0e9b78]"
              >
                {PROVIDERS[provider].linkLabel}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black text-[#0e9b78]">2.</span>
              <span>Copie a chave gerada ({PROVIDERS[provider].hint}).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black text-[#0e9b78]">3.</span>
              <span>Cole abaixo e salve — testamos na hora.</span>
            </li>
          </ol>

          <div className="flex items-stretch gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={provider === "google" ? "AIza… ou AQ.Ab8…" : "cole aqui a sua chave"}
              aria-label="Chave de API"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-[#e4d2bf] bg-white/85 px-3 py-2.5 font-mono text-sm dp-text-ink placeholder:text-[#a89380] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="flex shrink-0 items-center justify-center rounded-xl border border-[#e4d2bf] bg-white/70 px-3 text-[#8a7462] transition hover:bg-white"
              aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndTest}
              disabled={testing}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-60"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {testing ? "Validando…" : "Salvar e testar"}
            </button>
            {saved && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full bg-white/70 px-3 py-2 text-xs font-extrabold text-[#6f8a7e] transition hover:bg-white"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
