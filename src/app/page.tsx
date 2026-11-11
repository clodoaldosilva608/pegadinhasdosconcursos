"use client";

import { useCallback, useEffect, useState } from "react";
import { ScanSearch, BookOpen, BookMarked } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { Header } from "@/components/detector/Header";
import { HomeView } from "@/components/detector/HomeView";
import { ConfirmView } from "@/components/detector/ConfirmView";
import { AnalyzingView } from "@/components/detector/AnalyzingView";
import { ResultView } from "@/components/detector/ResultView";
import { DistractorsTab } from "@/components/detector/DistractorsTab";
import { VocabularyTab } from "@/components/detector/VocabularyTab";
import { getUserAi } from "@/lib/userAiStore";
import type {
  AccountInfo,
  AnalysisResult,
  AppView,
  ExtractedQuestion,
  MainTab,
} from "@/lib/types";

export default function DetectorPage() {
  const [tab, setTab] = useState<MainTab>("analisar");
  const [view, setView] = useState<AppView>("home");
  const [account, setAccount] = useState<AccountInfo | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [question, setQuestion] = useState<ExtractedQuestion | null>(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Carrega conta
  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d: AccountInfo) => setAccount(d))
      .catch(() => setAccount({ planLabel: "Conta interna", analysesLeft: 988, noDeadline: true }));
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      const r = await fetch("/api/account");
      const d = (await r.json()) as AccountInfo;
      setAccount(d);
    } catch {
      /* silencioso */
    }
  }, []);

  // Passo 1: mandar imagens/notas para extração
  const handleExtract = useCallback(async () => {
    if (images.length === 0 && notes.trim().length <= 3) {
      toast({
        title: "Falta a questão!",
        description: "Cole o print (Ctrl+V), arraste uma imagem ou digite o enunciado.",
      });
      return;
    }
    setExtractLoading(true);
    try {
      const userAi = getUserAi();
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userAi
            ? { "x-user-ai-key": userAi.key, "x-user-ai-provider": userAi.provider }
            : {}),
        },
        body: JSON.stringify({ images, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data?.question) {
        const notConfigured = typeof data?.error === "string" && data.error.includes("IA não configurada");
        toast({
          title: notConfigured ? "Conecte sua chave de IA" : "Não consegui ler a questão",
          description: notConfigured
            ? "No topo da página inicial, use a seção \"Sua chave de IA\": crie uma chave grátis no AI Studio e cole lá."
            : (data?.error ?? "Tente um print mais nítido ou digite o enunciado."),
        });
        return;
      }
      setQuestion(data.question as ExtractedQuestion);
      setView("confirm");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast({ title: "Erro de conexão", description: "Tente novamente em instantes." });
    } finally {
      setExtractLoading(false);
    }
  }, [images, notes]);

  // Passo 2: confirmar gabarito + marcação e rodar análise
  const handleAnalyze = useCallback(
    async (correctLetter: string, userMarked: string) => {
      if (!question) return;
      setAnalyzeLoading(true);
      setView("analyzing");
      window.scrollTo({ top: 0, behavior: "smooth" });
      try {
        const userAi = getUserAi();
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(userAi
              ? { "x-user-ai-key": userAi.key, "x-user-ai-provider": userAi.provider }
              : {}),
          },
          body: JSON.stringify({
            questionText: question.questionText,
            options: question.options,
            correctLetter,
            userMarked,
            organization: question.organization,
            notes,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.result) {
          const notConfigured = typeof data?.error === "string" && data.error.includes("IA não configurada");
          toast({
            title: notConfigured ? "Conecte sua chave de IA" : "Falha na análise",
            description: notConfigured
              ? "Volte à página inicial e conecte uma chave grátis na seção \"Sua chave de IA\"."
              : (data?.error ?? "Tente novamente em instantes."),
          });
          setView("confirm");
          return;
        }
        setResult(data.result as AnalysisResult);
        if (typeof data.analysesLeft === "number") {
          setAccount((a) => (a ? { ...a, analysesLeft: data.analysesLeft } : a));
        } else {
          void refreshAccount();
        }
        setView("result");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        toast({ title: "Erro de conexão", description: "Tente novamente em instantes." });
        setView("confirm");
      } finally {
        setAnalyzeLoading(false);
      }
    },
    [question, notes, refreshAccount]
  );

  const handleNewQuestion = useCallback(() => {
    setImages([]);
    setNotes("");
    setQuestion(null);
    setResult(null);
    setView("home");
    setTab("analisar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const showHeaderTabs = tab === "analisar" || view !== "result";

  return (
    <main className="dp-app-bg min-h-screen w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-10 pt-5 sm:px-6">
        <Header account={account} />

        {/* Tabs */}
        {showHeaderTabs && (
          <nav
            className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/55 p-1.5 shadow-inner shadow-amber-900/5"
            aria-label="Seções do Detector"
          >
            <button
              type="button"
              onClick={() => {
                setTab("analisar");
              }}
              aria-current={tab === "analisar" ? "page" : undefined}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${
                tab === "analisar"
                  ? "bg-[#0e9b78] text-white shadow-md shadow-emerald-900/25"
                  : "text-[#6f8a7e] hover:bg-white/70 hover:text-[#0e9b78]"
              }`}
            >
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              Analisar questão
            </button>
            <button
              type="button"
              onClick={() => setTab("distratores")}
              aria-current={tab === "distratores" ? "page" : undefined}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${
                tab === "distratores"
                  ? "bg-[#0e9b78] text-white shadow-md shadow-emerald-900/25"
                  : "text-[#6f8a7e] hover:bg-white/70 hover:text-[#0e9b78]"
              }`}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">O que são distratores</span>
              <span className="sm:hidden">Distratores</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("vocabulario")}
              aria-current={tab === "vocabulario" ? "page" : undefined}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${
                tab === "vocabulario"
                  ? "bg-[#0e9b78] text-white shadow-md shadow-emerald-900/25"
                  : "text-[#6f8a7e] hover:bg-white/70 hover:text-[#0e9b78]"
              }`}
            >
              <BookMarked className="h-4 w-4" aria-hidden="true" />
              Vocabulário
            </button>
          </nav>
        )}

        <div className="mt-4 flex-1">
          {tab === "distratores" ? (
            <DistractorsTab />
          ) : tab === "vocabulario" ? (
            <VocabularyTab />
          ) : view === "home" ? (
            <HomeView
              account={account}
              images={images}
              onImagesChange={setImages}
              notes={notes}
              onNotesChange={setNotes}
              onSubmit={handleExtract}
              loading={extractLoading}
            />
          ) : view === "confirm" && question ? (
            <ConfirmView
              question={question}
              images={images}
              onConfirm={handleAnalyze}
              onEdit={() => setView("home")}
              loading={analyzeLoading}
            />
          ) : view === "analyzing" ? (
            <AnalyzingView />
          ) : view === "result" && result ? (
            <ResultView result={result} onNewQuestion={handleNewQuestion} />
          ) : (
            <HomeView
              account={account}
              images={images}
              onImagesChange={setImages}
              notes={notes}
              onNotesChange={setNotes}
              onSubmit={handleExtract}
              loading={extractLoading}
            />
          )}
        </div>

        <footer className="mt-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#bda38c]">
            Detector de Pegadinhas · Con-curso
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#cbb5a0]">
            Estude pela questão · Conheça a banca · Aprofunde o conteúdo pelo gabarito
          </p>
        </footer>
      </div>
    </main>
  );
}
