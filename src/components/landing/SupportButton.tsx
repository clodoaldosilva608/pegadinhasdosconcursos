"use client";

// Botão "Suporte" com modal de contato. Requisito do dono do produto:
// o e-mail de suporte NÃO pode ficar visível na página — apenas o botão.
// A mensagem vai para a caixa de entrada do painel admin (/admin → Suporte);
// o e-mail/WhatsApp só são buscados da API quando o usuário pede o canal.

import { useState } from "react";
import { CheckCircle2, Loader2, Mail, MessageCircle, Send, X } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

interface ContactChannels {
  email: string | null;
  whatsapp: string | null;
}

function SupportModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [channels, setChannels] = useState<ContactChannels | null>(null);
  const [channelsLoading, setChannelsLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (res.ok && data.ok) {
        setDone(true);
      } else {
        setError(data.message ?? "Não consegui enviar agora. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  // Busca o canal somente no clique — o endereço nunca veio na página.
  const loadChannels = async () => {
    if (channels || channelsLoading) return;
    setChannelsLoading(true);
    try {
      const res = await fetch("/api/support/contact", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; email?: string | null; whatsapp?: string | null };
      if (res.ok && data.ok) {
        setChannels({ email: data.email ?? null, whatsapp: data.whatsapp ?? null });
      }
    } catch {
      // silencioso: usuário ainda pode usar o formulário
    } finally {
      setChannelsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Fale com o suporte"
    >
      <div className="dp-card w-full max-w-md rounded-3xl p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold dp-text-ink">Fale com o suporte</h3>
            <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
              Conte o que aconteceu — respondemos pelo e-mail informado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8a7462] transition hover:bg-[#f0e2cf]"
            aria-label="Fechar suporte"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {done ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#e0f3ed] px-3.5 py-3" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0e9b78]" aria-hidden="true" />
            <p className="text-xs font-extrabold text-[#0b7d61] leading-snug">
              Mensagem enviada! Vamos responder pelo e-mail informado o quanto antes.
            </p>
          </div>
        ) : (
          <form
            className="mt-3 flex flex-col gap-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome (opcional)"
              aria-label="Seu nome"
              autoComplete="name"
              className={inputCls}
            />
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
            <textarea
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descreva sua dúvida ou problema (ex.: pagamento, liberação de acesso, chave de IA)…"
              aria-label="Sua mensagem"
              rows={4}
              maxLength={4000}
              className={`${inputCls} resize-none`}
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {loading ? "Enviando…" : "Enviar mensagem"}
            </button>
            {error && (
              <p className="rounded-xl bg-[#fdeeEA] px-3 py-2 text-xs font-bold text-[#c2472f]" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        <div className="mt-4 border-t border-[#f0e2cf] pt-3">
          {channels === null ? (
            <button
              type="button"
              onClick={() => void loadChannels()}
              disabled={channelsLoading}
              className="mx-auto flex items-center gap-1.5 text-[11px] font-extrabold text-[#6f5b47] transition hover:text-[#0b7d61] disabled:opacity-60"
            >
              {channelsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Prefiro falar por e-mail ou WhatsApp
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {channels.email && (
                <a
                  href={`mailto:${channels.email}?subject=${encodeURIComponent("Ajuda com o Detector de Pegadinhas")}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#0e9b78]/35 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-[#0b7d61] transition hover:bg-white"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  Abrir meu app de e-mail
                </a>
              )}
              {channels.whatsapp && (
                <a
                  href={`https://wa.me/${channels.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Preciso de ajuda com o Detector de Pegadinhas.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#0e9b78]/35 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-[#0b7d61] transition hover:bg-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Falar no WhatsApp
                </a>
              )}
              {!channels.email && !channels.whatsapp && (
                <p className="text-[11px] font-semibold text-[#a08a77]">
                  Use o formulário acima — respondemos pelo seu e-mail.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SupportButton({
  label = "Suporte",
  variant = "button",
}: {
  label?: string;
  variant?: "button" | "link";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[#0b7d61] hover:underline"
        >
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c8b4] bg-white/80 px-4 py-2.5 text-xs font-extrabold text-[#6f5b47] shadow-sm transition hover:border-[#0e9b78]/40 hover:text-[#0b7d61]"
        >
          {label}
        </button>
      )}
      {open && <SupportModal onClose={() => setOpen(false)} />}
    </>
  );
}
