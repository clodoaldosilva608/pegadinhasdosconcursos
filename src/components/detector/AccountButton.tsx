"use client";

// Botão "Conta" no topo do DetectorApp (Task 21): abre painel com perfil,
// plano, histórico das últimas análises e sair. A lista vem de /api/analyses
// (análises vinculadas ao e-mail da sessão desde o cadastro obrigatório).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  LogOut,
  UserRound,
  XCircle,
} from "lucide-react";
import { PLAN_LABELS } from "@/lib/plans";
import { clearStoredAccess, type StoredAccess } from "@/lib/accessStore";

interface AnalysisRow {
  id: string;
  banca: string;
  organization: string;
  questionText: string;
  correctLetter: string;
  userMarked: string | null;
  createdAt: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const initials = (value: string) => {
  const clean = value.replace(/@.*$/, "").trim();
  const parts = clean.split(/[.\-_\s]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "U").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
};

export function AccountButton() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<{ email: string; name: string | null; access: StoredAccess | null } | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRow[] | null>(null);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await res.json()) as {
        loggedIn?: boolean;
        email?: string;
        name?: string | null;
        access?: StoredAccess | null;
      };
      if (data.loggedIn && data.email) {
        setSession({ email: data.email, name: data.name ?? null, access: data.access ?? null });
      }
    } catch {
      // silencioso — o botão fica com o estado genérico
    }
  }, []);

  const loadAnalyses = useCallback(async () => {
    setLoadingAnalyses(true);
    try {
      const res = await fetch("/api/analyses", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; items?: AnalysisRow[] };
      setAnalyses(data.ok && Array.isArray(data.items) ? data.items : []);
    } catch {
      setAnalyses([]);
    } finally {
      setLoadingAnalyses(false);
    }
  }, []);

  useEffect(() => {
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => void loadSession(), 0);
    return () => window.clearTimeout(t);
  }, [loadSession]);

  useEffect(() => {
    if (!open) return;
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => {
      if (analyses === null) void loadAnalyses();
    }, 0);
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", close);
    };
  }, [open, analyses, loadAnalyses]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    // Limpa o acesso pago local também: a sessão acabou.
    clearStoredAccess();
    window.location.reload();
  }, []);

  const label = session?.name || session?.email || "Conta";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Minha conta"
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/80 py-1.5 pl-1.5 pr-2 shadow-sm transition hover:bg-white sm:pr-2.5"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#17b98c] to-[#0b7d61] text-[11px] font-black text-white">
          {session ? initials(label) : <UserRound className="h-4 w-4" aria-hidden="true" />}
        </span>
        <span className="hidden max-w-[110px] truncate text-xs font-extrabold text-[#233028] sm:inline">
          {label}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[#6f8a7e]" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] dp-card rounded-2xl p-4 text-left shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#17b98c] to-[#0b7d61] text-xs font-black text-white">
              {session ? initials(label) : <UserRound className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold dp-text-ink">
                {session?.name || "Sua conta"}
              </p>
              <p className="truncate text-xs font-semibold text-[#8a7462]">
                {session?.email ?? "carregando…"}
              </p>
            </div>
          </div>

          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#e0f3ed] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#0b7d61]">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {session?.access
              ? `${PLAN_LABELS[session.access.plan] ?? "Acesso pago"} ativo`
              : "Conta gratuita"}
          </p>

          <div className="mt-3 border-t border-[#f0e2cf] pt-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#8a7462]">
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              Minhas análises
            </p>
            {loadingAnalyses || analyses === null ? (
              <div className="flex items-center justify-center gap-2 py-4 text-[#6f5b47]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="text-xs font-bold">Carregando…</span>
              </div>
            ) : analyses.length === 0 ? (
              <p className="py-3 text-center text-xs font-bold text-[#a08a77]">
                Nenhuma análise ainda — analise sua primeira questão!
              </p>
            ) : (
              <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
                {analyses.map((a) => {
                  const hit = a.userMarked && a.userMarked === a.correctLetter;
                  return (
                    <li
                      key={a.id}
                      className="rounded-xl bg-[#faf5ee] px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-black uppercase tracking-wide text-[#8a7462]">
                          {a.banca || "Banca"}
                          {a.organization ? ` · ${a.organization}` : ""}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-[#a08a77]">
                          {fmtDate(a.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-[#233028]">
                        {a.questionText}
                      </p>
                      <p
                        className={`mt-1 flex items-center gap-1 text-[10px] font-extrabold ${
                          hit ? "text-[#0b7d61]" : "text-[#c2472f]"
                        }`}
                      >
                        {hit ? (
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-3 w-3" aria-hidden="true" />
                        )}
                        {a.userMarked
                          ? `Você marcou ${a.userMarked} · gabarito ${a.correctLetter}`
                          : `Sem marcação · gabarito ${a.correctLetter}`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#e7d9c4] bg-white px-3 py-2 text-xs font-extrabold text-[#6f5b47] transition hover:bg-[#faf5ee]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
