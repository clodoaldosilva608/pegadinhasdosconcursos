"use client";

// Página de obrigado (configurada na Cakto como destino pós-pagamento).
// Ao chegar aqui com ?email=…, verifica o pagamento em polling — o webhook
// da Cakto normalmente já registrou a compra e o acesso abre na hora.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ScanSearch } from "lucide-react";
import { ShareCard } from "@/components/pwa/ShareCard";
import { VerifyBox } from "@/components/access/AccessGate";
import { setStoredAccess, type StoredAccess } from "@/lib/accessStore";

type Phase = "verifying" | "ok" | "manual";

function ObrigadoInner() {
  const params = useSearchParams();
  const emailParam = (params.get("email") ?? "").trim().toLowerCase();
  const [phase, setPhase] = useState<Phase>(emailParam ? "verifying" : "manual");
  const [email, setEmail] = useState(emailParam);
  const [access, setAccess] = useState<StoredAccess | null>(null);
  const attemptsRef = useRef(0);

  const tryVerify = useCallback(async (value: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        token?: string;
        plan?: string;
        email?: string;
        expiresAt?: string;
      };
      if (res.ok && data.ok && data.token) {
        const stored: StoredAccess = {
          token: data.token,
          email: data.email ?? value.toLowerCase(),
          plan: data.plan ?? "lifetime",
          expiresAt: data.expiresAt ?? "",
        };
        setStoredAccess(stored);
        setAccess(stored);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!emailParam) return;
    let cancelled = false;
    const poll = async () => {
      // Até 6 tentativas, 3s entre elas (o webhook costuma chegar em segundos).
      while (!cancelled && attemptsRef.current < 6) {
        attemptsRef.current += 1;
        const ok = await tryVerify(emailParam);
        if (cancelled) return;
        if (ok) {
          setPhase("ok");
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
      }
      if (!cancelled) setPhase("manual");
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [emailParam, tryVerify]);

  return (
    <main className="dp-app-bg min-h-screen w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-10 pt-6 sm:px-6">
        <header className="flex items-center justify-center gap-2.5">
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
        </header>

        {phase === "verifying" && (
          <div className="dp-card mt-6 rounded-3xl p-6 text-center">
            <Loader2
              className="mx-auto h-10 w-10 animate-spin text-[#0e9b78]"
              aria-hidden="true"
            />
            <h1 className="mt-3 text-lg font-black dp-text-ink">Confirmando seu pagamento…</h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm font-semibold text-[#6f5b47] leading-relaxed">
              Assim que o Pix for confirmado, o acesso é liberado automaticamente. Isso costuma
              levar poucos segundos.
            </p>
          </div>
        )}

        {phase === "ok" && access && (
          <div className="mt-6 space-y-4">
            <div className="dp-card rounded-3xl p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-[#0e9b78]" aria-hidden="true" />
              <h1 className="mt-3 text-xl font-black dp-text-ink">Pagamento confirmado!</h1>
              <p className="mx-auto mt-1.5 max-w-sm text-sm font-semibold text-[#6f5b47] leading-relaxed">
                Acesso <strong className="dp-text-ink">{access.plan === "lifetime" ? "Vitalício" : "Passe 30 dias"}</strong>{" "}
                liberado para <strong className="dp-text-ink">{access.email}</strong> neste aparelho.
                Bons estudos — e que a banca nunca mais te pegue de surpresa.
              </p>
              <Link
                href="/app"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/25 transition hover:from-[#0fa87f] hover:to-[#0b7d61]"
              >
                Entrar na plataforma
              </Link>
            </div>
            <ShareCard compact />
          </div>
        )}

        {phase === "manual" && (
          <div className="mt-6 space-y-4">
            <div className="dp-card rounded-3xl p-5 text-center">
              <h1 className="text-lg font-black dp-text-ink">Confirme seu acesso</h1>
              <p className="mx-auto mt-1.5 max-w-sm text-sm font-semibold text-[#6f5b47] leading-relaxed">
                {emailParam
                  ? "Seu pagamento ainda está sendo processado ou o registro não chegou. Tente verificar novamente abaixo — se o Pix acabou de ser aprovado, pode levar cerca de 1 minuto."
                  : "Informe o e-mail usado no pagamento para liberar o acesso neste aparelho."}
              </p>
            </div>
            <VerifyBox
              onUnlocked={(stored) => {
                setAccess(stored);
                setPhase("ok");
              }}
            />
            <div className="text-center">
              <Link href="/" className="text-xs font-extrabold text-[#0b7d61] underline decoration-2 underline-offset-2">
                Voltar para a página inicial
              </Link>
            </div>
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

export default function ObrigadoPage() {
  return (
    <Suspense
      fallback={
        <main className="dp-app-bg flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0e9b78]" aria-hidden="true" />
        </main>
      }
    >
      <ObrigadoInner />
    </Suspense>
  );
}
