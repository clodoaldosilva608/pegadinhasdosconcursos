import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/zai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_KEY_LENGTH = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const provider = body?.provider === "google" ? "google" : "zai";
    const key = String(body?.key ?? "").trim();

    if (!key) {
      return NextResponse.json({ ok: false, error: "Cole a chave antes de testar." });
    }
    if (key.length > MAX_KEY_LENGTH) {
      return NextResponse.json({ ok: false, error: "Essa chave parece grande demais. Copie só o valor da chave." });
    }
    if (provider === "google" && !key.startsWith("AIza")) {
      return NextResponse.json({
        ok: false,
        error:
          "Chaves do Google AI Studio começam com \"AIza\". Confira se você copiou a chave completa (botão copiar do AI Studio).",
      });
    }

    const zai = await getZai({ provider, apiKey: key });
    const response = await zai.chat.completions.create({
      messages: [{ role: "user", content: "Responda apenas com a palavra: ok" }],
      max_tokens: 16,
      thinking: { type: "disabled" },
    });
    const sample = (response.choices?.[0]?.message?.content ?? "").trim().slice(0, 40);
    return NextResponse.json({ ok: true, provider, sample: sample || "ok" });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Não consegui validar a chave agora.",
    });
  }
}
