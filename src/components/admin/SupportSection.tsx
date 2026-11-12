"use client";

// Aba "Suporte" do painel: caixa de entrada das mensagens enviadas pelo
// botão "Suporte" (landing/bloqueio). Responder abre o app de e-mail do
// admin para o REMETENTE; marcar lida/respondida e excluir.

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Mail, MailCheck, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SupportMessage {
  id: string;
  email: string;
  name: string | null;
  message: string;
  status: string; // new | read | replied
  createdAt: string;
}

interface Page {
  ok: boolean;
  items: SupportMessage[];
  total: number;
  page: number;
  pageSize: number;
  unread: number;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const inputCls =
  "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c8b4] bg-white/80 px-3 py-2 text-xs font-extrabold text-[#6f5b47] transition hover:bg-white disabled:opacity-60";

function StatusPill({ status }: { status: string }) {
  if (status === "new")
    return (
      <span className="rounded-full bg-[#f9ddc4] px-2 py-0.5 text-[10px] font-extrabold text-[#9a5b23]">
        nova
      </span>
    );
  if (status === "replied")
    return (
      <span className="rounded-full bg-[#e0f3ed] px-2 py-0.5 text-[10px] font-extrabold text-[#0b7d61]">
        respondida
      </span>
    );
  return (
    <span className="rounded-full bg-[#f0e2cf] px-2 py-0.5 text-[10px] font-extrabold text-[#8a7462]">
      lida
    </span>
  );
}

export function SupportSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<SupportMessage | null>(null);
  const [deleting, setDeleting] = useState<SupportMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/support?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const json = (await res.json()) as Page;
      if (json.ok) {
        setItems(json.items);
        setTotal(json.total);
        setUnread(json.unread);
        setPages(Math.max(1, Math.ceil(json.total / json.pageSize)));
      }
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const mark = async (msg: SupportMessage, next: string) => {
    const res = await fetch(`/api/admin/support/${msg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      toast({ title: next === "replied" ? "Marcada como respondida" : "Marcada como lida" });
      setOpen(null);
      void load();
    } else {
      toast({ title: "Erro ao atualizar", description: "Tente novamente." });
    }
  };

  const remove = async (msg: SupportMessage) => {
    const res = await fetch(`/api/admin/support/${msg.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Mensagem excluída", description: msg.email });
      setDeleting(null);
      setOpen(null);
      void load();
    } else {
      toast({ title: "Erro ao excluir", description: "Tente novamente." });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4ac93]" aria-hidden="true" />
          <input
            value={q}
            onChange={(event) => {
              setPage(1);
              setQ(event.target.value);
            }}
            placeholder="Buscar por e-mail ou nome…"
            aria-label="Buscar mensagens"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          aria-label="Filtrar por status"
          className="rounded-xl border border-[#e7d9c4] bg-white/90 px-3 py-2.5 text-sm font-bold text-[#233028] focus:border-[#0e9b78] focus:outline-none"
        >
          <option value="">Todas ({total})</option>
          <option value="new">Novas</option>
          <option value="read">Lidas</option>
          <option value="replied">Respondidas</option>
        </select>
        {unread > 0 && (
          <span className="rounded-full bg-[#f9ddc4] px-3 py-1.5 text-[11px] font-extrabold text-[#9a5b23]">
            {unread} não lida(s)
          </span>
        )}
      </div>

      <div className="dp-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e2cf] bg-[#fdf9f2]">
                {["Criado em", "E-mail", "Nome", "Mensagem", "Status", "Ações"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#8a7462]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e2cf]">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#0e9b78]" aria-hidden="true" />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-xs font-bold text-[#a08a77]">
                    Nenhuma mensagem recebida ainda.
                  </td>
                </tr>
              )}
              {items.map((msg) => (
                <tr key={msg.id} className="cursor-pointer hover:bg-[#fdf9f2]" onClick={() => setOpen(msg)}>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{fmtDate(msg.createdAt)}</td>
                  <td className="px-3 py-2.5 font-extrabold text-[#233028]">{msg.email}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{msg.name ?? "—"}</td>
                  <td className="max-w-[280px] px-3 py-2.5">
                    <p className="truncate text-xs font-semibold text-[#4c5f54]">{msg.message}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={msg.status} />
                  </td>
                  <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`mailto:${msg.email}?subject=${encodeURIComponent("Re: Suporte · Detector de Pegadinhas")}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7d9c4] bg-white text-[#0b7d61] transition hover:bg-[#fdf9f2]"
                        aria-label={`Responder para ${msg.email}`}
                        title="Responder por e-mail"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={() => void mark(msg, "replied")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7d9c4] bg-white text-[#0b7d61] transition hover:bg-[#fdf9f2]"
                        aria-label={`Marcar ${msg.email} como respondida`}
                        title="Marcar como respondida"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(msg)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2d9c8] bg-white text-[#c2472f] transition hover:bg-[#fdeeEA]"
                        aria-label={`Excluir mensagem de ${msg.email}`}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#f0e2cf] bg-[#fdf9f2] px-3 py-2">
          <p className="text-[11px] font-bold text-[#8a7462]">
            {total} mensagem(ns) · página {page} de {pages}
          </p>
          <div className="flex gap-1.5">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={btnGhost}>
              Anterior
            </button>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={btnGhost}>
              Próxima
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="dp-card w-full max-w-lg rounded-3xl p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold dp-text-ink">Mensagem de suporte</h3>
                <p className="mt-0.5 text-xs font-semibold text-[#8a7462]">
                  {open.name ? `${open.name} · ` : ""}
                  {open.email} · {fmtDate(open.createdAt)}
                </p>
              </div>
              <StatusPill status={open.status} />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#fdf9f2] p-3.5 text-sm font-semibold leading-relaxed text-[#4c5f54]">
              {open.message}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpen(null)} className={btnGhost}>
                Fechar
              </button>
              <button type="button" onClick={() => void mark(open, "read")} className={btnGhost}>
                <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Marcar lida
              </button>
              <button type="button" onClick={() => void mark(open, "replied")} className={btnGhost}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Respondida
              </button>
              <a
                href={`mailto:${open.email}?subject=${encodeURIComponent("Re: Suporte · Detector de Pegadinhas")}&body=${encodeURIComponent("Olá" + (open.name ? `, ${open.name}` : "") + "!\n\n")}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-2 text-xs font-extrabold text-white shadow-md transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Responder
              </a>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="dp-card w-full max-w-sm rounded-3xl p-5">
            <h3 className="text-base font-extrabold dp-text-ink">Excluir mensagem?</h3>
            <p className="mt-1 text-xs font-semibold text-[#6f5b47]">
              A mensagem de {deleting.email} será removida definitivamente.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className={btnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void remove(deleting)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#e25744] px-4 py-2 text-xs font-extrabold text-white shadow-md transition hover:bg-[#c2472f]"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
