"use client";

// Formulário do funil de captação (LGPD): e-mail + WhatsApp com
// consentimento explícito. Usado na landing (seção completa), na tela de
// bloqueio e na faixa do lançamento (versão compacta).

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

interface LeadResponse {
  ok: boolean;
  message?: string;
}

export function LeadForm({ source = "landing", compact = false }: { source?: string; compact?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!consent) {
      setError("Autorize o envio para cadastrar (LGPD).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, whatsapp, consent, source }),
      });
      const data = (await res.json()) as LeadResponse;
      if (res.ok && data.ok) {
        setDone(true);
      } else {
        setError(data.message ?? "Não consegui cadastrar agora. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl bg-[#e0f3ed] px-3.5 py-3"
        role="status"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0e9b78]" aria-hidden="true" />
        <p className="text-xs font-extrabold text-[#0b7d61] leading-snug">
          Pronto! Você está na lista — vai receber novidades e ofertas em primeira mão.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className={compact ? "flex flex-col gap-2.5" : "grid gap-2.5 sm:grid-cols-2"}>
        {!compact && (
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Seu nome (opcional)"
            aria-label="Seu nome"
            autoComplete="name"
            className={`${inputCls} sm:col-span-2`}
          />
        )}
        <input
          type="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu@email.com"
          aria-label="Seu e-mail"
          autoComplete="email"
          className={inputCls}
        />
        <input
          type="tel"
          inputMode="tel"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="WhatsApp com DDD (opcional)"
          aria-label="Seu WhatsApp com DDD"
          autoComplete="tel"
          className={inputCls}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e9b78]"
        />
        <span className="text-[11px] font-semibold leading-snug text-[#6f5b47]">
          Autorizo o Detector de Pegadinhas a me enviar novidades e ofertas por e-mail e
          WhatsApp. Posso pedir remoção a qualquer momento (LGPD).
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        {loading ? "Cadastrando…" : "Quero receber novidades"}
      </button>

      {error && (
        <p className="rounded-xl bg-[#fdeeEA] px-3 py-2 text-xs font-bold text-[#c2472f]" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
