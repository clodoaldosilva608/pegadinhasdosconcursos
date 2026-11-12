"use client";

// Painel admin completo: visão geral (KPIs), CRUD de leads (com export CSV),
// gestão de compras (aprovar/revogar + liberação manual) e contas internas.
// Sessão via cookie HttpOnly assinado (/api/admin/login).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  BarChart3,
  Download,
  KeyRound,
  LifeBuoy,
  Loader2,
  LogIn,
  LogOut,
  MailCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Undo2,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLAN_LABELS } from "@/lib/plans";
import { SupportSection } from "@/components/admin/SupportSection";
import { SiteSection } from "@/components/admin/SiteSection";
import { RecoveriesSection } from "@/components/admin/RecoveriesSection";

// ===== tipos =====

interface Lead {
  id: string;
  email: string;
  name: string | null;
  whatsapp: string | null;
  consent: boolean;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Purchase {
  id: string;
  email: string;
  plan: string;
  status: string;
  provider: string;
  refId: string | null;
  amountCents: number | null;
  createdAt: string;
}

interface Account {
  id: string;
  planLabel: string;
  analysesLeft: number;
  noDeadline: boolean;
  updatedAt: string;
}

interface AppUserRow {
  id: string;
  deviceId: string;
  plan: string;
  email: string | null;
  userAgent: string | null;
  visits: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface Overview {
  leads: { total: number; last7days: number };
  purchases: { approved: number; refunded: number; revenueCents: number };
  accounts: number;
  analyses: number;
  support: { total: number; unread: number };
  appUsers: { total: number; last7days: number };
  dbEphemeral: boolean;
  recentLeads: Lead[];
  recentPurchases: Purchase[];
}

type Session = "loading" | "anon" | "ok";
type Tab = "overview" | "appusers" | "purchases" | "leads" | "recoveries" | "support" | "site" | "accounts";

const fmtBRL = (cents: number | null) =>
  cents === null ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const inputCls =
  "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70";

const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c8b4] bg-white/80 px-3 py-2 text-xs font-extrabold text-[#6f5b47] transition hover:bg-white disabled:opacity-60";

// ===== login =====

function LoginForm({ onOk }: { onOk: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (res.ok && data.ok) {
        toast({ title: "Bem-vindo de volta!", description: "Sessão iniciada por 8 horas." });
        onOk();
      } else {
        setError(data.message ?? "Credenciais incorretas.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dp-app-bg flex min-h-screen items-center justify-center px-4">
      <div className="dp-card w-full max-w-sm rounded-3xl p-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#233028] text-white shadow-lg">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-lg font-black dp-text-ink">Painel Admin</h1>
          <p className="mt-0.5 text-xs font-semibold text-[#8a7462]">
            Acesso exclusivo do dono do Detector de Pegadinhas.
          </p>
        </div>
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail do administrador"
            aria-label="E-mail do administrador"
            autoComplete="username"
            className={inputCls}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
            aria-label="Senha"
            autoComplete="current-password"
            className={inputCls}
          />
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            {loading ? "Entrando…" : "Entrar no painel"}
          </button>
          {error && (
            <p className="rounded-xl bg-[#fdeeEA] px-3 py-2 text-xs font-bold text-[#c2472f]" role="alert">
              {error}
            </p>
          )}
        </form>
        <p className="mt-4 text-center text-[11px] font-semibold text-[#a08a77]">
          <Link href="/" className="font-extrabold text-[#0b7d61] hover:underline">
            ← Voltar para a página inicial
          </Link>
        </p>
      </div>
    </main>
  );
}

// ===== visão geral =====

function KpiCard({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string; hint?: string }) {
  return (
    <div className="dp-card rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e0f3ed] text-[#0e9b78]">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a7462]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums dp-text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] font-semibold text-[#a08a77]">{hint}</p>}
    </div>
  );
}

function OverviewSection() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const json = (await res.json()) as { ok: boolean } & Overview;
      if (json.ok) {
        setData(json);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (error) {
    return <p className="dp-card rounded-2xl p-4 text-sm font-bold text-[#c2472f]">Erro ao carregar. Tente atualizar.</p>;
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[#6f5b47]">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <p className="text-sm font-extrabold">Carregando indicadores…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.dbEphemeral && (
        <div className="rounded-2xl border border-[#f2d9a0] bg-[#fdf6dd] p-3.5" role="status">
          <p className="text-xs font-extrabold text-[#8a6a1a]">
            ⚠️ Banco de dados temporário neste deploy
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#9a7c2a] leading-snug">
            A Vercel descarta o SQLite em /tmp quando o servidor hiberna — leads, compras,
            suporte e usuários do app podem zerar entre acessos distantes. Para histórico
            permanente, migre para um banco gerenciado (Neon/Turso/Vercel Postgres).
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Smartphone} label="Usuários do app" value={String(data.appUsers?.total ?? 0)} hint={`+${data.appUsers?.last7days ?? 0} novos nos últimos 7 dias`} />
        <KpiCard icon={Users} label="Leads" value={String(data.leads.total)} hint={`+${data.leads.last7days} nos últimos 7 dias`} />
        <KpiCard icon={BadgeDollarSign} label="Compras aprovadas" value={String(data.purchases.approved)} hint={`${data.purchases.refunded} reembolsadas`} />
        <KpiCard icon={BarChart3} label="Receita (Pix)" value={fmtBRL(data.purchases.revenueCents)} hint="Compras aprovadas via Cakto" />
        <KpiCard icon={MailCheck} label="Análises armazenadas" value={String(data.analyses)} hint={`${data.accounts} conta(s) interna(s)`} />
        <KpiCard icon={LifeBuoy} label="Suporte" value={String(data.support?.total ?? 0)} hint={`${data.support?.unread ?? 0} não lida(s)`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="dp-card rounded-2xl p-4">
          <h3 className="text-sm font-extrabold dp-text-ink">Últimos leads</h3>
          <ul className="mt-2 divide-y divide-[#f0e2cf]">
            {data.recentLeads.length === 0 && (
              <li className="py-2 text-xs font-semibold text-[#a08a77]">Nenhum lead ainda.</li>
            )}
            {data.recentLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-[#233028]">{lead.email}</p>
                  <p className="text-[11px] font-semibold text-[#8a7462]">
                    {lead.source} · {fmtDate(lead.createdAt)}
                  </p>
                </div>
                {lead.whatsapp && <span className="shrink-0 text-[11px] font-bold text-[#0b7d61]">{lead.whatsapp}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="dp-card rounded-2xl p-4">
          <h3 className="text-sm font-extrabold dp-text-ink">Últimas compras</h3>
          <ul className="mt-2 divide-y divide-[#f0e2cf]">
            {data.recentPurchases.length === 0 && (
              <li className="py-2 text-xs font-semibold text-[#a08a77]">Nenhuma compra ainda.</li>
            )}
            {data.recentPurchases.map((purchase) => (
              <li key={purchase.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-[#233028]">{purchase.email}</p>
                  <p className="text-[11px] font-semibold text-[#8a7462]">
                    {PLAN_LABELS[purchase.plan] ?? purchase.plan} · {fmtDate(purchase.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    purchase.status === "approved" ? "bg-[#e0f3ed] text-[#0b7d61]" : "bg-[#fdeeEA] text-[#c2472f]"
                  }`}
                >
                  {purchase.status === "approved" ? "aprovada" : "reembolsada"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ===== leads =====

interface Page<T> {
  ok: boolean;
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function LeadsSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (source) params.set("source", source);
      const res = await fetch(`/api/admin/leads?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const json = (await res.json()) as Page<Lead>;
      if (json.ok) {
        setItems(json.items);
        setTotal(json.total);
        setPages(Math.max(1, Math.ceil(json.total / json.pageSize)));
      }
    } finally {
      setLoading(false);
    }
  }, [page, q, source]);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const remove = async (lead: Lead) => {
    const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Lead removido", description: lead.email });
      setDeleting(null);
      void load();
    } else {
      toast({ title: "Não foi possível remover", description: "Tente novamente." });
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
            placeholder="Buscar por e-mail, nome ou WhatsApp…"
            aria-label="Buscar leads"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={source}
          onChange={(event) => {
            setPage(1);
            setSource(event.target.value);
          }}
          aria-label="Filtrar por origem"
          className="rounded-xl border border-[#e7d9c4] bg-white/90 px-3 py-2.5 text-sm font-bold text-[#233028] focus:border-[#0e9b78] focus:outline-none"
        >
          <option value="">Todas as origens</option>
          <option value="landing">Landing</option>
          <option value="app">App</option>
          <option value="gate">Tela de bloqueio</option>
          <option value="admin">Admin</option>
        </select>
        <a href="/api/admin/leads/export" className={btnGhost}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Exportar CSV
        </a>
        <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo lead
        </button>
      </div>

      <div className="dp-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e2cf] bg-[#fdf9f2]">
                {["E-mail", "Nome", "WhatsApp", "Origem", "Consentiu", "Criado em", "Ações"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#8a7462]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e2cf]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#0e9b78]" aria-hidden="true" />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs font-bold text-[#a08a77]">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              )}
              {items.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#fdf9f2]">
                  <td className="px-3 py-2.5 font-extrabold text-[#233028]">{lead.email}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{lead.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{lead.whatsapp ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-[#f9ddc4] px-2 py-0.5 text-[10px] font-extrabold text-[#9a5b23]">{lead.source}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {lead.consent ? (
                      <span className="rounded-full bg-[#e0f3ed] px-2 py-0.5 text-[10px] font-extrabold text-[#0b7d61]">sim</span>
                    ) : (
                      <span className="rounded-full bg-[#fdeeEA] px-2 py-0.5 text-[10px] font-extrabold text-[#c2472f]">não</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{fmtDate(lead.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(lead)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7d9c4] bg-white text-[#6f5b47] transition hover:bg-[#fdf9f2]"
                        aria-label={`Editar ${lead.email}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(lead)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2d9c8] bg-white text-[#c2472f] transition hover:bg-[#fdeeEA]"
                        aria-label={`Excluir ${lead.email}`}
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
            {total} lead(s) · página {page} de {pages}
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

      {(creating || editing) && (
        <LeadDialog
          lead={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void load();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="dp-card w-full max-w-sm rounded-3xl p-5">
            <h3 className="text-base font-extrabold dp-text-ink">Excluir lead?</h3>
            <p className="mt-1 text-xs font-semibold text-[#6f5b47]">
              {deleting.email} deixará de receber comunicações. A ação é definitiva.
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

function LeadDialog({ lead, onClose, onSaved }: { lead: Lead | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState(lead?.email ?? "");
  const [name, setName] = useState(lead?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(lead?.whatsapp ?? "");
  const [consent, setConsent] = useState(lead?.consent ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(lead ? `/api/admin/leads/${lead.id}` : "/api/admin/leads", {
        method: lead ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, whatsapp, consent, source: lead?.source ?? "admin" }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (res.ok && data.ok) {
        toast({ title: lead ? "Lead atualizado" : "Lead criado", description: email });
        onSaved();
      } else {
        toast({ title: "Erro ao salvar", description: data.message ?? "Verifique os dados." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="dp-card w-full max-w-md rounded-3xl p-5">
        <h3 className="text-base font-extrabold dp-text-ink">{lead ? "Editar lead" : "Novo lead"}</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          <input
            type="email"
            disabled={!!lead}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            aria-label="E-mail do lead"
            className={`${inputCls} disabled:opacity-60`}
          />
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome (opcional)" aria-label="Nome" className={inputCls} />
          <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="WhatsApp (opcional)" aria-label="WhatsApp" className={inputCls} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="h-4 w-4 accent-[#0e9b78]" />
            <span className="text-xs font-bold text-[#6f5b47]">Autorizou receber comunicações (LGPD)</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="button" onClick={() => void save()} disabled={saving} className={btnPrimary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== compras =====

function PurchasesSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState<Purchase | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/purchases?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const json = (await res.json()) as Page<Purchase>;
      if (json.ok) {
        setItems(json.items);
        setTotal(json.total);
        setPages(Math.max(1, Math.ceil(json.total / json.pageSize)));
      }
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const toggleStatus = async (purchase: Purchase) => {
    const next = purchase.status === "approved" ? "refunded" : "approved";
    const res = await fetch(`/api/admin/purchases/${purchase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      toast({
        title: next === "refunded" ? "Acesso revogado" : "Acesso reativado",
        description: purchase.email,
      });
      void load();
    } else {
      toast({ title: "Erro ao atualizar", description: "Tente novamente." });
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
            placeholder="Buscar por e-mail…"
            aria-label="Buscar compras"
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
          <option value="">Todos os status</option>
          <option value="approved">Aprovadas</option>
          <option value="refunded">Reembolsadas</option>
        </select>
        <button type="button" onClick={() => setUnlockOpen(true)} className={btnPrimary}>
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Liberar acesso manual
        </button>
      </div>

      <div className="dp-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e2cf] bg-[#fdf9f2]">
                {["E-mail", "Plano", "Status", "Valor", "Ref", "Criado em", "Ações"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#8a7462]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e2cf]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#0e9b78]" aria-hidden="true" />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs font-bold text-[#a08a77]">
                    Nenhuma compra encontrada.
                  </td>
                </tr>
              )}
              {items.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-[#fdf9f2]">
                  <td className="px-3 py-2.5 font-extrabold text-[#233028]">{purchase.email}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[#6f5b47]">{PLAN_LABELS[purchase.plan] ?? purchase.plan}</td>
                  <td className="px-3 py-2.5">
                    {purchase.status === "approved" ? (
                      <span className="rounded-full bg-[#e0f3ed] px-2 py-0.5 text-[10px] font-extrabold text-[#0b7d61]">aprovada</span>
                    ) : (
                      <span className="rounded-full bg-[#fdeeEA] px-2 py-0.5 text-[10px] font-extrabold text-[#c2472f]">reembolsada</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold tabular-nums text-[#0b7d61]">{fmtBRL(purchase.amountCents)}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#8a7462]">{purchase.refId ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{fmtDate(purchase.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void toggleStatus(purchase)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7d9c4] bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-[#6f5b47] transition hover:bg-[#fdf9f2]"
                      >
                        {purchase.status === "approved" ? (
                          <>
                            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Revogar
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            Reativar
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(purchase)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7d9c4] bg-white text-[#6f5b47] transition hover:bg-[#fdf9f2]"
                        aria-label={`Editar conta de ${purchase.email}`}
                        title="Editar conta (plano, e-mail, status, valor)"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(purchase)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2d9c8] bg-white text-[#c2472f] transition hover:bg-[#fdeeEA]"
                        aria-label={`Excluir conta de ${purchase.email}`}
                        title="Excluir registro"
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
            {total} compra(s) · página {page} de {pages}
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

      {unlockOpen && (
        <UnlockDialog
          onClose={() => setUnlockOpen(false)}
          onSaved={() => {
            setUnlockOpen(false);
            void load();
          }}
        />
      )}

      {editing && (
        <EditPurchaseDialog
          purchase={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="dp-card w-full max-w-md rounded-3xl p-5">
            <h3 className="text-base font-extrabold dp-text-ink">Excluir conta?</h3>
            <p className="mt-1 text-xs font-semibold text-[#6f5b47]">
              {deleting.email} · {PLAN_LABELS[deleting.plan] ?? deleting.plan}. Isso remove o
              registro do banco. Atenção: se o objetivo é BLOQUEAR o acesso, use “Revogar” — é o
              registro reembolsado que nega os tokens deste e-mail.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className={btnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/admin/purchases/${deleting.id}`, { method: "DELETE" });
                  if (res.ok) {
                    toast({ title: "Registro excluído", description: deleting.email });
                    setDeleting(null);
                    void load();
                  } else {
                    toast({ title: "Erro ao excluir", description: "Tente novamente." });
                  }
                }}
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

function EditPurchaseDialog({
  purchase,
  onClose,
  onSaved,
}: {
  purchase: Purchase;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState(purchase.email);
  const [plan, setPlan] = useState(purchase.plan === "pass30" ? "pass30" : "lifetime");
  const [status, setStatus] = useState(purchase.status === "refunded" ? "refunded" : "approved");
  const [amount, setAmount] = useState(
    purchase.amountCents !== null ? (purchase.amountCents / 100).toFixed(2).replace(".", ",") : ""
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const parsed = amount.trim()
        ? Math.round(Number(amount.replace(/\./g, "").replace(",", ".")) * 100)
        : null;
      const res = await fetch(`/api/admin/purchases/${purchase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          plan,
          status,
          ...(parsed !== null && Number.isFinite(parsed) ? { amountCents: parsed } : {}),
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (res.ok && data.ok) {
        toast({ title: "Conta atualizada", description: `${email} · ${PLAN_LABELS[plan] ?? plan}` });
        onSaved();
      } else {
        toast({ title: "Erro ao salvar", description: data.message ?? "Verifique os dados." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="dp-card w-full max-w-md rounded-3xl p-5">
        <h3 className="text-base font-extrabold dp-text-ink">Editar conta</h3>
        <p className="mt-1 text-xs font-semibold text-[#6f5b47]">
          Altere o tipo de plano, o e-mail, o status ou o valor. Trocar plano/e-mail mescla os
          registros em uma única conta.
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail do usuário"
            aria-label="E-mail do usuário"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value === "pass30" ? "pass30" : "lifetime")}
              aria-label="Tipo de plano"
              className="rounded-xl border border-[#e7d9c4] bg-white/90 px-3 py-2.5 text-sm font-bold text-[#233028] focus:border-[#0e9b78] focus:outline-none"
            >
              <option value="lifetime">Vitalício</option>
              <option value="pass30">Passe 30 dias</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value === "refunded" ? "refunded" : "approved")}
              aria-label="Status do acesso"
              className="rounded-xl border border-[#e7d9c4] bg-white/90 px-3 py-2.5 text-sm font-bold text-[#233028] focus:border-[#0e9b78] focus:outline-none"
            >
              <option value="approved">Aprovado (acesso ativo)</option>
              <option value="refunded">Revogado (bloqueado)</option>
            </select>
          </div>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Valor pago em R$ (ex.: 29,90)"
            aria-label="Valor pago"
            inputMode="decimal"
            className={inputCls}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || !email.trim()} className={btnPrimary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Salvando…" : "Salvar conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnlockDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"lifetime" | "pass30">("lifetime");
  const [loading, setLoading] = useState(false);

  const unlock = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (res.ok && data.ok) {
        toast({ title: "Acesso liberado", description: data.message });
        onSaved();
      } else {
        toast({ title: "Não foi possível liberar", description: data.message ?? "Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="dp-card w-full max-w-md rounded-3xl p-5">
        <h3 className="text-base font-extrabold dp-text-ink">Criar/liberar acesso</h3>
        <p className="mt-1 text-xs font-semibold text-[#6f5b47]">
          Cria a conta do usuário (ou libera quando o webhook da Cakto falhar). O token gerado
          vale para o aparelho em que for colado.
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail do comprador"
            aria-label="E-mail do comprador"
            className={inputCls}
          />
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value === "pass30" ? "pass30" : "lifetime")}
            aria-label="Plano"
            className="rounded-xl border border-[#e7d9c4] bg-white/90 px-3 py-2.5 text-sm font-bold text-[#233028] focus:border-[#0e9b78] focus:outline-none"
          >
            <option value="lifetime">Vitalício</option>
            <option value="pass30">Passe 30 dias</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="button" onClick={() => void unlock()} disabled={loading || !email.trim()} className={btnPrimary}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Liberando…" : "Liberar acesso"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== contas =====

function AccountsSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Account | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accounts", { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const json = (await res.json()) as { ok: boolean; items: Account[] };
      if (json.ok) setItems(json.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-[#6f5b47]">
        Contas internas de operação (não são as dos usuários — essas ficam em Compras).
      </p>
      <div className="dp-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e2cf] bg-[#fdf9f2]">
                {["ID", "Plano", "Análises restantes", "Sem prazo", "Atualizada", "Ações"].map((h) => (
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
              {items.map((account) => (
                <tr key={account.id} className="hover:bg-[#fdf9f2]">
                  <td className="px-3 py-2.5 font-mono text-xs font-bold text-[#233028]">{account.id}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[#6f5b47]">{account.planLabel}</td>
                  <td className="px-3 py-2.5 text-xs font-bold tabular-nums text-[#0b7d61]">{account.analysesLeft}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[#6f5b47]">{account.noDeadline ? "sim" : "não"}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{fmtDate(account.updatedAt)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setEditing(account)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7d9c4] bg-white text-[#6f5b47] transition hover:bg-[#fdf9f2]"
                      aria-label={`Editar conta ${account.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="dp-card w-full max-w-md rounded-3xl p-5">
            <h3 className="text-base font-extrabold dp-text-ink">Editar conta</h3>
            <div className="mt-3 flex flex-col gap-2.5">
              <input
                value={editing.planLabel}
                onChange={(event) => setEditing({ ...editing, planLabel: event.target.value })}
                placeholder="Rótulo do plano"
                aria-label="Rótulo do plano"
                className={inputCls}
              />
              <input
                type="number"
                min={0}
                value={editing.analysesLeft}
                onChange={(event) => setEditing({ ...editing, analysesLeft: Number(event.target.value) })}
                aria-label="Análises restantes"
                className={inputCls}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.noDeadline}
                  onChange={(event) => setEditing({ ...editing, noDeadline: event.target.checked })}
                  className="h-4 w-4 accent-[#0e9b78]"
                />
                <span className="text-xs font-bold text-[#6f5b47]">Sem prazo de validade</span>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className={btnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/admin/accounts/${editing.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      planLabel: editing.planLabel,
                      analysesLeft: editing.analysesLeft,
                      noDeadline: editing.noDeadline,
                    }),
                  });
                  if (res.ok) {
                    toast({ title: "Conta atualizada" });
                    setEditing(null);
                    void load();
                  } else {
                    toast({ title: "Erro ao atualizar" });
                  }
                }}
                className={btnPrimary}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== usuários do app (Task 18) =====

const APP_PLAN_LABELS: Record<string, string> = {
  free: "GRÁTIS LANÇAMENTO",
  pass30: "Passe 30 dias",
  lifetime: "Vitalício",
};

function deviceSummary(ua: string | null): string {
  if (!ua) return "Aparelho desconhecido";
  const u = ua.toLowerCase();
  const os = u.includes("iphone") || u.includes("ipad")
    ? "iOS"
    : u.includes("android")
      ? "Android"
      : u.includes("windows")
        ? "Windows"
        : u.includes("mac os") || u.includes("macintosh")
          ? "Mac"
          : "Outro";
  const browser = u.includes("edg/")
    ? "Edge"
    : u.includes("chrome/") || u.includes("crios")
      ? "Chrome"
      : u.includes("firefox")
        ? "Firefox"
        : u.includes("safari")
          ? "Safari"
          : "Navegador";
  return `${os} · ${browser}`;
}

function AppUsersSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<AppUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AppUserRow | null>(null);
  const [deleting, setDeleting] = useState<AppUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/appusers?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const json = (await res.json()) as Page<AppUserRow>;
      if (json.ok) {
        setItems(json.items);
        setTotal(json.total);
        setPages(Math.max(1, Math.ceil(json.total / json.pageSize)));
      }
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

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
            placeholder="Buscar por e-mail, aparelho ou ID…"
            aria-label="Buscar usuários do app"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      <p className="text-xs font-semibold text-[#6f5b47]">
        Cada aparelho que abre o app aparece aqui automaticamente — com o plano quando há acesso
        pago verificado neste aparelho (restante: uso gratuito do lançamento).
      </p>

      <div className="dp-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e2cf] bg-[#fdf9f2]">
                {["E-mail", "Plano", "Aparelho", "Visitas", "1ª visita", "Última visita", "Ações"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#8a7462]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e2cf]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#0e9b78]" aria-hidden="true" />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs font-bold text-[#a08a77]">
                    Nenhum usuário do app ainda — abre o /app em um aparelho para registrar.
                  </td>
                </tr>
              )}
              {items.map((user) => (
                <tr key={user.id} className="hover:bg-[#fdf9f2]">
                  <td className="px-3 py-2.5 font-extrabold text-[#233028]">{user.email ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        user.plan === "free"
                          ? "bg-[#f9ddc4] text-[#9a5b23]"
                          : user.plan === "lifetime"
                            ? "bg-[#e0f3ed] text-[#0b7d61]"
                            : "bg-[#fdeeEA] text-[#c2472f]"
                      }`}
                    >
                      {APP_PLAN_LABELS[user.plan] ?? user.plan}
                    </span>
                  </td>
                  <td className="max-w-[180px] px-3 py-2.5">
                    <p className="truncate text-xs font-bold text-[#6f5b47]" title={user.userAgent ?? undefined}>
                      {deviceSummary(user.userAgent)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-black tabular-nums text-[#233028]">{user.visits}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{fmtDate(user.firstSeenAt)}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#6f5b47]">{fmtDate(user.lastSeenAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7d9c4] bg-white text-[#6f5b47] transition hover:bg-[#fdf9f2]"
                        aria-label={`Editar aparelho ${user.email ?? user.deviceId}`}
                        title="Corrigir plano/e-mail do aparelho"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2d9c8] bg-white text-[#c2472f] transition hover:bg-[#fdeeEA]"
                        aria-label={`Excluir aparelho ${user.email ?? user.deviceId}`}
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
            {total} aparelho(s) · página {page} de {pages}
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

      {editing && (
        <EditAppUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="dp-card w-full max-w-sm rounded-3xl p-5">
            <h3 className="text-base font-extrabold dp-text-ink">Excluir aparelho?</h3>
            <p className="mt-1 text-xs font-semibold text-[#6f5b47]">
              {deleting.email ?? deviceSummary(deleting.userAgent)} sai da lista e do KPI. A ação é
              definitiva (o aparelho volta a contar como novo se abrir o app de novo).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className={btnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/admin/appusers/${deleting.id}`, { method: "DELETE" });
                  if (res.ok) {
                    toast({ title: "Aparelho removido" });
                    setDeleting(null);
                    void load();
                  } else {
                    toast({ title: "Erro ao excluir", description: "Tente novamente." });
                  }
                }}
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

function EditAppUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AppUserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState(user.email ?? "");
  const [plan, setPlan] = useState(user.plan);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/appusers/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (res.ok && data.ok) {
        toast({ title: "Aparelho atualizado", description: APP_PLAN_LABELS[plan] ?? plan });
        onSaved();
      } else {
        toast({ title: "Erro ao salvar", description: "Tente novamente." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="dp-card w-full max-w-md rounded-3xl p-5">
        <h3 className="text-base font-extrabold dp-text-ink">Editar aparelho</h3>
        <p className="mt-1 text-xs font-semibold text-[#6f5b47]">
          Corrija o plano/e-mail registrado para este aparelho (ex.: presente liberado manualmente).
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail associado (opcional)"
            aria-label="E-mail associado ao aparelho"
            className={inputCls}
          />
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            aria-label="Plano do aparelho"
            className="rounded-xl border border-[#e7d9c4] bg-white/90 px-3 py-2.5 text-sm font-bold text-[#233028] focus:border-[#0e9b78] focus:outline-none"
          >
            <option value="free">Grátis (lançamento)</option>
            <option value="pass30">Passe 30 dias</option>
            <option value="lifetime">Vitalício</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="button" onClick={() => void save()} disabled={saving} className={btnPrimary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== shell =====

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "overview", label: "Visão geral", icon: BarChart3 },
  { id: "appusers", label: "Usuários do app", icon: Smartphone },
  { id: "purchases", label: "Usuários & planos", icon: BadgeDollarSign },
  { id: "leads", label: "Leads", icon: Users },
  { id: "recoveries", label: "Recuperação", icon: Undo2 },
  { id: "support", label: "Suporte", icon: LifeBuoy },
  { id: "site", label: "Site", icon: SlidersHorizontal },
  { id: "accounts", label: "Conta interna", icon: UserRoundCog },
];

export function AdminApp() {
  const [session, setSession] = useState<Session>("loading");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        if (!cancelled) setSession(res.ok ? "ok" : "anon");
      } catch {
        if (!cancelled) setSession("anon");
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (session === "loading") {
    return (
      <main className="dp-app-bg flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 text-[#6f5b47]">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <p className="text-sm font-extrabold">Verificando sessão…</p>
        </div>
      </main>
    );
  }

  if (session === "anon") {
    return <LoginForm onOk={() => setSession("ok")} />;
  }

  return (
    <main className="dp-app-bg min-h-screen w-full pb-10">
      <header className="sticky top-0 z-30 border-b border-white/40 bg-[#fdf3e6]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#233028] text-white shadow-md">
              <UserRoundCog className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold dp-text-ink">Painel Admin</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a6a52]">
                Detector de Pegadinhas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-[#d9c8b4] bg-white/80 px-3 py-1.5 text-xs font-extrabold text-[#6f5b47] transition hover:bg-white"
            >
              Ver site
            </Link>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                window.location.reload();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#233028] px-3.5 py-2 text-xs font-extrabold text-white shadow-md transition hover:bg-[#31423a]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Seções do painel">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                tab === item.id
                  ? "bg-[#0e9b78] text-white shadow-md shadow-emerald-900/20"
                  : "border border-[#d9c8b4] bg-white/80 text-[#6f5b47] hover:bg-white"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-4">
          {tab === "overview" && <OverviewSection />}
          {tab === "appusers" && <AppUsersSection />}
          {tab === "leads" && <LeadsSection />}
          {tab === "purchases" && <PurchasesSection />}
          {tab === "recoveries" && <RecoveriesSection />}
          {tab === "support" && <SupportSection />}
          {tab === "site" && <SiteSection />}
          {tab === "accounts" && <AccountsSection />}
        </div>
      </div>
    </main>
  );
}
