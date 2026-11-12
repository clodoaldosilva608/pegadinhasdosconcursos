"use client";

// Aba "Recuperação" do painel: lista de abandonos de checkout (evento
// checkout_abandonment da Cakto) com envio em 1 clique — WhatsApp/e-mail com
// mensagem pronta de recuperação (vantagens vs. desvantagens), copiar,
// marcar como recuperado (também automático quando o pagamento cai) e excluir.

import { useCallback, useEffect, useState } from "react";
import {
  AlarmClock,
  Check,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLAN_LABELS } from "@/lib/plans";
import {
  isEmail,
  mailtoRecoveryLink,
  recoveryMessage,
  recoverySubject,
  waRecoveryLink,
  type PlanId,
} from "@/lib/recovery";

interface Abandonment {
  id: string;
  email: string;
  plan: string;
  phone: string | null;
  productRef: string | null;
  lastEventAt: string;
  recoveredAt: string | null;
  createdAt: string;
}

const fmtDate = (iso: string) =>
  Number.isNaN(new Date(iso).getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));

const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c8b4] bg-white/80 px-3 py-2 text-xs font-extrabold text-[#6f5b47] transition hover:bg-white disabled:opacity-60";

const btnTiny =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition disabled:opacity-60";

export function RecoveriesSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<Abandonment[] | null>(null);
  const [q, setQ] = useState("");
  const [showRecovered, setShowRecovered] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/recoveries", { cache: "no-store" });
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const json = (await res.json()) as { ok: boolean; items?: Abandonment[] };
    if (json.ok && json.items) setItems(json.items);
    else setItems([]);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const patch = async (item: Abandonment, recovered: boolean) => {
    const res = await fetch(`/api/admin/recoveries/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recovered }),
    });
    if (res.ok) {
      toast({
        title: recovered ? "Marcado como recuperado" : "Reaberto como pendente",
        description: item.email,
      });
      void load();
    } else {
      toast({ title: "Não foi possível atualizar", description: "Tente novamente." });
    }
  };

  const remove = async (item: Abandonment) => {
    if (!window.confirm(`Excluir o registro de abandono de ${item.email}?`)) return;
    const res = await fetch(`/api/admin/recoveries/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Registro excluído", description: item.email });
      void load();
    } else {
      toast({ title: "Não foi possível excluir", description: "Tente novamente." });
    }
  };

  const copyMessage = async (item: Abandonment) => {
    const text = recoveryMessage(item.plan as PlanId);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Mensagem copiada", description: `Cole no chat de ${item.email}.` });
    } catch {
      toast({ title: "Não consegui copiar", description: "Copie manualmente." });
    }
  };

  if (items === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[#6f5b47]">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <p className="text-sm font-extrabold">Carregando abandonos…</p>
      </div>
    );
  }

  const term = q.trim().toLowerCase();
  const filtered = items.filter(
    (item) =>
      (showRecovered || !item.recoveredAt) &&
      (!term ||
        item.email.includes(term) ||
        (item.phone ?? "").includes(term) ||
        (item.productRef ?? "").toLowerCase().includes(term))
  );
  const pendingCount = items.filter((item) => !item.recoveredAt).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4ac93]"
            aria-hidden="true"
          />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por e-mail, WhatsApp ou pedido…"
            aria-label="Buscar abandonos"
            className="w-full rounded-xl border border-[#e7d9c4] bg-white/90 py-2.5 pl-9 pr-3.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#fdf9f2] px-3 py-2">
          <input
            type="checkbox"
            checked={showRecovered}
            onChange={(event) => setShowRecovered(event.target.checked)}
            className="h-4 w-4 accent-[#0e9b78]"
          />
          <span className="text-xs font-extrabold text-[#6f5b47]">Mostrar recuperados</span>
        </label>
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-[#e7d9c4] bg-white/60 p-3 text-xs font-semibold text-[#6f5b47] leading-snug">
        <AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-[#9a5b23]" aria-hidden="true" />
        <span>
          <strong>{pendingCount}</strong> {pendingCount === 1 ? "abandono pendente" : "abandonos pendentes"}.
          Cada linha é alguém que preencheu o checkout da Cakto e não pagou. Envie a mensagem pronta em
          1 clique (WhatsApp ou e-mail) — ela mostra o que a pessoa ganha e o que arrisca ao desistir.
          Quando o pagamento cair, o registro vira “recuperado” automaticamente.
        </span>
      </p>

      {filtered.length === 0 ? (
        <div className="dp-card rounded-2xl p-6 text-center">
          <p className="text-sm font-extrabold dp-text-ink">Nenhum abandono por aqui</p>
          <p className="mt-1 text-xs font-semibold text-[#8a7462]">
            Quando alguém preencher o checkout e não finalizar o Pix, aparece aqui na hora.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => {
            const plan = item.plan as PlanId;
            const hasPhone = Boolean(item.phone);
            const hasEmail = isEmail(item.email);
            return (
              <div
                key={item.id}
                className={`dp-card flex flex-col gap-2.5 rounded-2xl p-3.5 ${
                  item.recoveredAt ? "opacity-70" : "border-l-4 border-l-[#e2a23a]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold dp-text-ink">{item.email}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-[#8a7462]">
                      {PLAN_LABELS[plan] ?? plan} · último evento {fmtDate(item.lastEventAt)}
                      {item.phone ? ` · WhatsApp ${item.phone}` : " · sem WhatsApp"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      item.recoveredAt
                        ? "bg-[#e0f3ed] text-[#0b7d61]"
                        : "bg-[#f9ddc4] text-[#9a5b23]"
                    }`}
                  >
                    {item.recoveredAt ? (
                      <>
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Recuperado
                      </>
                    ) : (
                      "Pendente"
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <a
                    href={hasPhone ? waRecoveryLink(item.phone ?? "", plan) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!hasPhone}
                    onClick={(event) => {
                      if (!hasPhone) event.preventDefault();
                    }}
                    className={`${btnTiny} text-white ${
                      hasPhone ? "bg-[#25d366] hover:bg-[#1fb857]" : "cursor-not-allowed bg-[#d9c8b4]"
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    WhatsApp
                  </a>
                  <a
                    href={
                      hasEmail
                        ? mailtoRecoveryLink(item.email, plan)
                        : undefined
                    }
                    aria-disabled={!hasEmail}
                    onClick={(event) => {
                      if (!hasEmail) event.preventDefault();
                    }}
                    className={`${btnTiny} bg-[#229ed9] text-white hover:bg-[#1c8bc0]`}
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    E-mail
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyMessage(item)}
                    className={`${btnTiny} border border-[#d9c8b4] bg-white/80 text-[#6f5b47] hover:bg-white`}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copiar mensagem
                  </button>
                  <button
                    type="button"
                    onClick={() => void patch(item, !item.recoveredAt)}
                    className={`${btnTiny} border border-[#d9c8b4] bg-white/80 text-[#6f5b47] hover:bg-white`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.recoveredAt ? "Reabrir" : "Marcar recuperado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    className={`${btnTiny} border border-[#f3cfc5] bg-white/80 text-[#c2472f] hover:bg-[#fdeeEA]`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
