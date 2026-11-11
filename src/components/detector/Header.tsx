"use client";

import { ScanSearch, Sparkles } from "lucide-react";
import type { AccountInfo } from "@/lib/types";

interface HeaderProps {
  account: AccountInfo | null;
}

export function Header({ account }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-emerald-900/20"
          style={{
            background: "linear-gradient(135deg, #14b98d 0%, #0b7d61 100%)",
          }}
          aria-hidden="true"
        >
          <ScanSearch className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold leading-tight dp-text-ink sm:text-xl">
            Detector de Pegadinhas
          </h1>
          <p className="text-xs font-semibold text-[#8a6a52] leading-tight sm:text-sm">
            Con-curso
          </p>
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/80 px-2.5 py-1.5 shadow-sm sm:px-3"
        title={account ? `Conta ${account.planLabel}` : "Conta interna"}
      >
        <Sparkles className="h-3.5 w-3.5 text-[#0e9b78]" aria-hidden="true" />
        <span className="text-xs font-extrabold text-[#0e9b78] tabular-nums sm:text-sm">
          {account ? account.analysesLeft : "—"}
        </span>
        <span className="hidden text-xs font-semibold text-[#6f8a7e] sm:inline sm:text-sm">
          análises
        </span>
      </div>
    </header>
  );
}
