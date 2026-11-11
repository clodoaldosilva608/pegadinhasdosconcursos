import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/zai";
import { buildExtractMessages, safeParse } from "@/lib/analysis";
import type { ExtractedQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FALLBACK: ExtractedQuestion = {
  organization: "Não identificada",
  banca: "Banca não identificada",
  year: "",
  role: "",
  questionText: "",
  options: [],
  observations: "",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const images: string[] = Array.isArray(body?.images) ? body.images.slice(0, 4) : [];
    const notes: string = typeof body?.notes === "string" ? body.notes : "";

    if (images.length === 0 && !notes.trim()) {
      return NextResponse.json(
        { error: "Envie ao menos uma imagem ou digite a questão." },
        { status: 400 }
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
    const messages = buildExtractMessages(images, notes);

    const response = await zai.chat.completions.createVision({
      messages,
      thinking: { type: "disabled" },
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = safeParse<ExtractedQuestion>(raw);

    if (!parsed || !parsed.questionText || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      // fallback: tenta devolver o que der, sinalizando para o usuário digitar
      if (parsed?.questionText && parsed.options?.length >= 1) {
        return NextResponse.json({ question: { ...FALLBACK, ...parsed } });
      }
      return NextResponse.json(
        {
          error:
            "Não consegui ler a questão com clareza. Tente uma foto mais nítida ou digite o enunciado no campo de texto.",
          question: null,
        },
        { status: 422 }
      );
    }

    const question: ExtractedQuestion = {
      organization: parsed.organization || "Não identificada",
      banca: parsed.banca || parsed.organization || "Banca não identificada",
      year: parsed.year ?? "",
      role: parsed.role ?? "",
      questionText: parsed.questionText,
      options: parsed.options
        .filter((o) => o && o.text)
        .map((o, i) => ({
          letter: (o.letter || String.fromCharCode(65 + i)).toUpperCase().slice(0, 1),
          text: o.text,
        })),
      observations: parsed.observations ?? "",
    };

    return NextResponse.json({ question });
  } catch (error) {
    console.error("[extract POST]", error);
    const detail = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { error: detail ?? "Falha ao ler a questão. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
