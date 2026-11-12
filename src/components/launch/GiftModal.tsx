"use client";

// Modal "Presentear um amigo" (Task 18): compra do Vitalício como presente de
// Natal. 3 passos — quem recebe → quem dá → confirmação — e o pedido cai na
// caixa de Suporte do painel com a tag [Presente de Natal], para o dono
// liberar o acesso do presenteado depois de confirmar o Pix.

import { useState } from "react";
import { CheckCircle2, Gift, Loader2, Mail, UserRound } from "lucide-react";
import type { PlanInfo } from "@/lib/plans";

const inputCls =
  "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

interface GiftModalProps {
  plan: PlanInfo;
  onClose: () => void;
}

export function GiftModal({ plan, onClose }: GiftModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // quem recebe
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  // quem dá
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [note, setNote] = useState("");

  const canNext1 = toName.trim().length >= 2 && isEmail(toEmail);
  const canNext2 = fromName.trim().length >= 2 && isEmail(fromEmail);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const message = [
        "[Presente de Natal] Pedido de presente — acesso vitalício",
        `Para (quem recebe): ${toName.trim()} <${toEmail.trim().toLowerCase()}>`,
        `De (quem presenteia): ${fromName.trim()} <${fromEmail.trim().toLowerCase()}>`,
        note.trim() ? `Dedicatória: ${note.trim()}` : "Dedicatória: —",
        "Ação: confirmar o Pix do presente e liberar o acesso do presenteado.",
      ].join("\n");
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fromName.trim(), email: fromEmail.trim(), message }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (res.ok && data.ok) {
        setStep(4);
      } else {
        setError(data.message ?? "Não consegui registrar agora. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente em instantes.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="dp-card w-full max-w-md rounded-3xl p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#c1121f] text-white shadow-md">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black dp-text-ink leading-tight">Presentear um amigo</h3>
            <p className="mt-0.5 text-xs font-semibold text-[#8a7462] leading-snug">
              {plan.name} · {plan.price} — um presente de Natal que vira aprovação.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-2 py-1 text-lg font-black text-[#a08a77] transition hover:bg-[#fdf9f2] hover:text-[#233028]"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* trilha de passos */}
        {step < 4 && (
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-[#c1121f]" : "bg-[#f0e2cf]"}`}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#8a7462]">
              Passo 1 de 3 · Quem vai ganhar
            </p>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4ac93]" aria-hidden="true" />
              <input
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Nome de quem recebe"
                aria-label="Nome de quem recebe o presente"
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4ac93]" aria-hidden="true" />
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="E-mail de quem recebe"
                aria-label="E-mail de quem recebe o presente"
                className={`${inputCls} pl-9`}
              />
            </div>
            <p className="text-[11px] font-semibold text-[#a08a77]">
              O acesso é liberado no e-mail informado depois da confirmação do Pix.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#8a7462]">
              Passo 2 de 3 · Quem dá o presente
            </p>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4ac93]" aria-hidden="true" />
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Seu nome"
                aria-label="Nome de quem presenteia"
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4ac93]" aria-hidden="true" />
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="Seu e-mail"
                aria-label="E-mail de quem presenteia"
                className={`${inputCls} pl-9`}
              />
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Dedicatória (opcional): ex.: “Esse presente é pra você passar em 2027!”"
              aria-label="Dedicatória do presente (opcional)"
              className={`${inputCls} resize-none`}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#8a7462]">
              Passo 3 de 3 · Confira o pedido
            </p>
            <div className="rounded-2xl bg-[#fdf9f2] p-3 text-[13px] font-semibold text-[#4c5f54]">
              <p>
                <span className="font-black text-[#233028]">Presente:</span> {plan.name} · {plan.price}
              </p>
              <p className="mt-1">
                <span className="font-black text-[#233028]">Para:</span> {toName.trim()} ({toEmail.trim()})
              </p>
              <p className="mt-1">
                <span className="font-black text-[#233028]">De:</span> {fromName.trim()} ({fromEmail.trim()})
              </p>
              {note.trim() && (
                <p className="mt-1">
                  <span className="font-black text-[#233028]">Dedicatória:</span> “{note.trim()}”
                </p>
              )}
            </div>
            <p className="text-[11px] font-semibold text-[#a08a77]">
              Seu pedido vai para o suporte com a etiqueta de presente. Depois é só pagar no Pix —
              o acesso do presenteado é liberado pela equipe.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#0e9b78]" aria-hidden="true" />
            <p className="text-sm font-black dp-text-ink">Pedido de presente registrado!</p>
            <p className="text-xs font-semibold text-[#6f5b47] leading-snug">
              Falta só o Pix: pague {plan.price} no botão abaixo e a equipe libera o acesso de{" "}
              <strong>{toName.trim()}</strong> no e-mail informado.
            </p>
            {plan.checkout && (
              <a
                href={plan.checkout}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#c1121f] to-[#8f0f1a] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:from-[#a30f19] hover:to-[#7a0d15]"
              >
                <Gift className="h-4 w-4" aria-hidden="true" />
                Pagar o presente agora · {plan.price}
              </a>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-[#fdeeEA] px-3 py-2 text-xs font-bold text-[#c2472f]" role="alert">
            {error}
          </p>
        )}

        {step < 4 && (
          <div className="mt-4 flex items-center justify-between gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 4 ? 4 : ((s - 1) as 1 | 2)))}
                className="rounded-xl border border-[#d9c8b4] bg-white/80 px-4 py-2.5 text-sm font-extrabold text-[#6f5b47] transition hover:bg-white"
              >
                Voltar
              </button>
            ) : (
              <span />
            )}
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c1121f] to-[#8f0f1a] px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:from-[#a30f19] hover:to-[#7a0d15] disabled:opacity-60"
              >
                Continuar
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canNext2}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c1121f] to-[#8f0f1a] px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:from-[#a30f19] hover:to-[#7a0d15] disabled:opacity-60"
              >
                Continuar
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c1121f] to-[#8f0f1a] px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:from-[#a30f19] hover:to-[#7a0d15] disabled:opacity-70"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {sending ? "Enviando…" : "Enviar pedido de presente"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
