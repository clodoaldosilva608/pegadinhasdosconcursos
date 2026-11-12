import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/zai";
import { requireAccessBySiteConfig } from "@/lib/gate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_KEY_LENGTH = 300;

export async function POST(req: NextRequest) {
  // Acesso: janela grátis de lançamento ou paywall desligado no painel.
  const denied = await requireAccessBySiteConfig(req);
  if (denied) return denied;

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
    // O Google emite chaves em dois formatos: AIza… (antiga) e AQ.Ab8… (nova, desde 2026)
    if (provider === "google" && !/^(AIza|AQ\.)/.test(key)) {
      return NextResponse.json({
        ok: false,
        error:
          'Chaves do Google AI Studio começam com "AIza" (formato antigo) ou "AQ." (formato novo). Confira se você copiou a chave completa (botão copiar do AI Studio).',
      });
    }

    const zai = await getZai({ provider, apiKey: key });
    // Probe de UM modelo com resposta rápida: basta provar que a chave autentica.
    // "model" opcional permite diagnosticar um modelo específico; por padrão usa
    // o primeiro da cadeia (gemini-3.8-flash para Google).
    const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : undefined;
    const response = await zai.chat.completions.create({
      messages: [{ role: "user", content: "Responda apenas com a palavra: ok" }],
      max_tokens: 16,
      thinking: { type: "disabled" },
      ...(model ? { model } : {}),
      dp_maxAttempts: 1,
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
