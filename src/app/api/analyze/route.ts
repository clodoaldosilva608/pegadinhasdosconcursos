import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/zai";
import {
  buildAnalyzeMessages,
  safeParse,
  normalizeAnalysis,
  type AnalyzeInput,
} from "@/lib/analysis";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input: AnalyzeInput = {
      questionText: String(body?.questionText ?? ""),
      options: Array.isArray(body?.options)
        ? body.options
            .filter((o: { letter?: string; text?: string }) => o?.text)
            .map((o: { letter?: string; text?: string }, i: number) => ({
              letter: (o.letter || String.fromCharCode(65 + i)).toUpperCase().slice(0, 1),
              text: o.text,
            }))
        : [],
      correctLetter: String(body?.correctLetter ?? "").toUpperCase().slice(0, 1),
      userMarked: body?.userMarked ? String(body.userMarked).toUpperCase().slice(0, 1) : "",
      organization: body?.organization ? String(body.organization) : "",
      notes: body?.notes ? String(body.notes) : "",
    };

    if (!input.questionText.trim() || input.options.length < 2 || !input.correctLetter) {
      return NextResponse.json(
        { error: "Questão incompleta: preciso do enunciado, das alternativas e do gabarito." },
        { status: 400 }
      );
    }

    // Conta + limite de análises
    const db = await dbReady();
    let account = await db.account.findUnique({ where: { id: "internal" } });
    if (!account) {
      account = await db.account.create({
        data: { id: "internal", planLabel: "Conta interna", analysesLeft: 988, noDeadline: true },
      });
    }
    if (account.analysesLeft <= 0) {
      return NextResponse.json(
        { error: "Suas análises acabaram. Fale com o time Con-curso para renovar." },
        { status: 402 }
      );
    }

    // BYOK: se o usuário conectou a própria chave, ela é usada nesta chamada.
    const userKey = req.headers.get("x-user-ai-key")?.trim().slice(0, 300);
    const override = userKey
      ? {
          provider: req.headers.get("x-user-ai-provider") === "google" ? ("google" as const) : ("zai" as const),
          apiKey: userKey,
        }
      : undefined;

    const zai = await getZai(override);
    const messages = buildAnalyzeMessages(input);

    const response = await zai.chat.completions.create({
      messages,
      thinking: { type: "enabled" },
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = safeParse<Parameters<typeof normalizeAnalysis>[0]>(raw);

    if (!parsed || !Array.isArray(parsed.options)) {
      return NextResponse.json(
        { error: "A análise não retornou no formato esperado. Tente novamente." },
        { status: 502 }
      );
    }

    const result = normalizeAnalysis(parsed, input);

    // Decrementa contador e persiste a análise
    const updated = await db.account.update({
      where: { id: "internal" },
      data: { analysesLeft: { decrement: 1 } },
    });

    await db.analysis.create({
      data: {
        banca: result.banca,
        organization: result.organization,
        questionText: result.questionText,
        correctLetter: input.correctLetter,
        userMarked: input.userMarked || null,
        optionsJson: JSON.stringify(input.options),
        resultJson: JSON.stringify(result),
      },
    });

    return NextResponse.json({ result, analysesLeft: Math.max(0, updated.analysesLeft) });
  } catch (error) {
    console.error("[analyze POST]", error);
    const detail = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { error: detail ?? "Falha ao analisar a questão. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
