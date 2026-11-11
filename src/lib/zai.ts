// Cliente unificado da API de IA.
// Três modos de operação, sem mudar o código das rotas:
//  1. Override BYOK (por requisição): o usuário conectou a própria chave
//     (Google AI Studio/Gemini ou Z.ai) no app — usada só para aquela chamada.
//  2. Sandbox/local: arquivo .z-ai-config (cwd, home ou /etc) — gateway interno.
//  3. Produção: variáveis de ambiente ZAI_API_KEY (+ opcionais).
//
// Google (AI Studio): chamamos o ENDPOINT NATIVO do Gemini
// (/v1beta/models/{model}:generateContent com header x-goog-api-key), e não o
// OpenAI-compatível. Motivo: as chaves novas do AI Studio (formato "AQ.",
// emitidas desde 2026) retornam 400 "Multiple authentication credentials
// received" quando enviadas como Authorization: Bearer no endpoint
// OpenAI-compatível. O header x-goog-api-key no endpoint nativo funciona
// tanto com chaves novas (AQ.) quanto antigas (AIza).
import fs from "fs/promises";
import path from "path";
import os from "os";

export interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
  token?: string;
}

export interface ZaiChatResponse {
  choices: Array<{ message?: { content?: string } }>;
}

export type AiProvider = "google" | "zai";

export interface AiOverride {
  provider: AiProvider;
  apiKey: string;
}

const DEFAULT_OPEN_BASE = "https://api.z.ai/api/paas/v4";
const GOOGLE_NATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";
// Z.ai: cadeia de modelos — tenta o preferencial e cai para o próximo só quando a
// conta do usuário não tem o modelo disponível. GLM-5.3 exige thinking enabled,
// portanto NÃO entra na cadeia (o app usa thinking disabled).
const TEXT_MODEL_FALLBACKS = ["glm-4.6", "glm-4.7-flash", "glm-4.5"];
const VISION_MODEL_FALLBACKS = ["glm-4.6v", "glm-4.5v", "glm-4.6v-flash"];
// Google: contas novas nem sempre têm acesso a todos os modelos antigos, então
// tentamos em cadeia. O próprio Google recomenda gemini-3.8-flash para usuários
// novos (gemini-2.5-flash deixou de ser disponibilizado a eles em 2026).
const GOOGLE_MODEL_FALLBACKS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-latest",
];

function envTrim(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

function configFromEnv(): ZaiConfig | null {
  const apiKey = envTrim("ZAI_API_KEY");
  if (!apiKey) return null;
  return {
    baseUrl: (envTrim("ZAI_API_BASE") ?? DEFAULT_OPEN_BASE).replace(/\/+$/, ""),
    apiKey,
    token: envTrim("ZAI_API_TOKEN"),
    chatId: envTrim("ZAI_CHAT_ID"),
    userId: envTrim("ZAI_USER_ID"),
  };
}

const CONFIG_PATHS = [
  () => path.join(process.cwd(), ".z-ai-config"),
  () => path.join(os.homedir(), ".z-ai-config"),
  () => "/etc/.z-ai-config",
];

async function configFromFile(): Promise<ZaiConfig | null> {
  for (const build of CONFIG_PATHS) {
    try {
      const raw = await fs.readFile(build(), "utf-8");
      const cfg = JSON.parse(raw) as ZaiConfig;
      if (cfg?.baseUrl && cfg?.apiKey) return cfg;
    } catch {
      // tenta o próximo caminho
    }
  }
  return null;
}

export function isInternalMode(cfg: ZaiConfig): boolean {
  const forced = envTrim("ZAI_MODE");
  if (forced === "internal" || forced === "open") return forced === "internal";
  return Boolean(cfg.token) || cfg.baseUrl.includes("internal-api");
}

interface Resolved {
  cfg: ZaiConfig;
  mode: "internal" | "open";
  provider: "zai" | "google";
}

function normalizeProvider(p: string | null | undefined): AiProvider {
  return p === "google" ? "google" : "zai";
}

function resolve(override?: AiOverride): Resolved | null {
  if (override?.apiKey) {
    const provider = normalizeProvider(override.provider);
    const baseUrl =
      provider === "google"
        ? (envTrim("GOOGLE_API_BASE") ?? GOOGLE_NATIVE_BASE).replace(/\/+$/, "")
        : (envTrim("ZAI_API_BASE") ?? DEFAULT_OPEN_BASE).replace(/\/+$/, "");
    return { cfg: { baseUrl, apiKey: override.apiKey }, mode: "open", provider };
  }
  const cfg = configFromEnv();
  if (cfg) {
    return { cfg, mode: isInternalMode(cfg) ? "internal" : "open", provider: "zai" };
  }
  return null;
}

export async function hasServerAi(): Promise<boolean> {
  if (resolve()) return true;
  return Boolean(await configFromFile());
}

type ChatBody = {
  messages?: unknown;
  thinking?: { type: "enabled" | "disabled" };
  model?: string;
  stream?: boolean;
  max_tokens?: number;
  [key: string]: unknown;
};

// Resposta do endpoint nativo do Gemini (formato não-OpenAI).
interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { code?: number; message?: string; status?: string };
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiPayload {
  contents: Array<{ role: string; parts: GeminiPart[] }>;
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: { maxOutputTokens?: number };
}

function toGeminiParts(content: unknown): GeminiPart[] {
  if (typeof content === "string") {
    return content.trim() ? [{ text: content }] : [];
  }
  if (!Array.isArray(content)) return [];
  const parts: GeminiPart[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { type?: unknown; text?: unknown; image_url?: unknown };
    if (rec.type === "text" && typeof rec.text === "string" && rec.text.trim()) {
      parts.push({ text: rec.text });
      continue;
    }
    if (rec.type === "image_url" && rec.image_url && typeof rec.image_url === "object") {
      const url = (rec.image_url as { url?: unknown }).url;
      // Data-URL "data:image/jpeg;base64,XXXX" → inlineData nativo do Gemini
      if (typeof url === "string") {
        const match = /^data:([^;]+);base64,(.*)$/.exec(url);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
  }
  return parts;
}

/** Converte mensagens OpenAI (formato do app) para o payload nativo do Gemini. */
export function toGeminiPayload(body: ChatBody): GeminiPayload {
  const systemParts: string[] = [];
  const contents: Array<{ role: string; parts: GeminiPart[] }> = [];
  const messages = Array.isArray(body.messages)
    ? (body.messages as Array<{ role?: unknown; content?: unknown }>)
    : [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    if (m.role === "system") {
      const parts = toGeminiParts(m.content);
      const text = parts.map((p) => p.text ?? "").join("\n").trim();
      if (text) systemParts.push(text);
      continue;
    }
    const role = m.role === "assistant" ? "model" : "user";
    const parts = toGeminiParts(m.content);
    if (parts.length > 0) contents.push({ role, parts });
  }
  const payload: GeminiPayload = { contents };
  if (systemParts.length > 0) {
    payload.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
  }
  if (typeof body.max_tokens === "number" && body.max_tokens > 0) {
    payload.generationConfig = { maxOutputTokens: body.max_tokens };
  }
  return payload;
}

class ZaiClient {
  public readonly chat: {
    completions: {
      create: (body: ChatBody) => Promise<ZaiChatResponse>;
      createVision: (body: ChatBody) => Promise<ZaiChatResponse>;
    };
  };

  constructor(private readonly res: Resolved) {
    this.chat = {
      completions: {
        create: (body: ChatBody) => this.create(body),
        createVision: (body: ChatBody) => this.createVision(body),
      },
    };
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.res.cfg.apiKey}`,
      "X-Z-AI-From": "Z",
    };
    if (this.res.cfg.chatId) headers["X-Chat-Id"] = this.res.cfg.chatId;
    if (this.res.cfg.userId) headers["X-User-Id"] = this.res.cfg.userId;
    if (this.res.cfg.token) headers["X-Token"] = this.res.cfg.token;
    return headers;
  }

  private async post(pathname: string, body: ChatBody): Promise<ZaiChatResponse> {
    const url = `${this.res.cfg.baseUrl}${pathname}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(
        `Não consegui falar com a API de IA: ${err instanceof Error ? err.message : "erro de rede"}`
      );
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `A IA recusou a chave (${response.status}). Confira se a chave está correta e ativa. Detalhe: ${detail}`
        );
      }
      if (response.status === 429) {
        throw new Error(
          "A IA atingiu o limite de uso desta chave agora (429). Aguarde alguns segundos e tente de novo."
        );
      }
      if (detail.includes("valid API key") || detail.includes("API key not valid")) {
        throw new Error(
          "O Google não reconheceu essa chave. Confira se copiou a chave completa (começa com \"AIza\") e se ela está ativa no AI Studio."
        );
      }
      throw new Error(`API de IA falhou (${response.status}): ${detail}`);
    }
    return (await response.json()) as ZaiChatResponse;
  }

  private prepare(body: ChatBody, model?: string): ChatBody {
    const payload: ChatBody = { ...body };
    if (!payload.thinking) {
      payload.thinking = { type: "disabled" };
    }
    if (model) payload.model = model;
    return payload;
  }

  /** Cadeia de modelos a tentar (modo open; gateway interno escolhe sozinho). */
  private modelCandidates(kind: "chat" | "vision"): string[] {
    const custom = kind === "vision" ? envTrim("ZAI_MODEL_VISION") : envTrim("ZAI_MODEL");
    return custom ? [custom] : kind === "vision" ? VISION_MODEL_FALLBACKS : TEXT_MODEL_FALLBACKS;
  }

  private async runWithFallback(kind: "chat" | "vision", body: ChatBody): Promise<ZaiChatResponse> {
    // Google AI Studio: endpoint NATIVO do Gemini (chaves AQ. e AIza via x-goog-api-key).
    if (this.res.provider === "google") return this.runGoogle(kind, body);
    const pathname =
      kind === "vision" && this.res.mode === "internal" ? "/chat/completions/vision" : "/chat/completions";
    if (this.res.mode === "internal") {
      return this.post(pathname, this.prepare(body));
    }
    const models = this.modelCandidates(kind);
    let lastError: unknown;
    for (let i = 0; i < models.length; i++) {
      try {
        return await this.post(pathname, this.prepare(body, models[i]));
      } catch (err) {
        lastError = err;
        if (i < models.length - 1 && isModelUnavailable(err)) continue;
        throw err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Falha na chamada de IA.");
  }

  /** Cadeia de modelos Google (contas novas nem sempre têm os modelos antigos). */
  private async runGoogle(kind: "chat" | "vision", body: ChatBody): Promise<ZaiChatResponse> {
    const custom = kind === "vision" ? envTrim("ZAI_MODEL_VISION") : envTrim("ZAI_MODEL");
    const models = custom ? [custom] : GOOGLE_MODEL_FALLBACKS;
    let lastError: unknown;
    for (let i = 0; i < models.length; i++) {
      try {
        return await this.postGemini(models[i], body);
      } catch (err) {
        lastError = err;
        if (i < models.length - 1 && isModelUnavailable(err)) continue;
        throw err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Falha na chamada de IA.");
  }

  /** Chamada ao endpoint nativo do Gemini (aceita chaves novas "AQ." e antigas "AIza"). */
  private async postGemini(model: string, body: ChatBody): Promise<ZaiChatResponse> {
    const url = `${this.res.cfg.baseUrl}/models/${model}:generateContent`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.res.cfg.apiKey,
        },
        body: JSON.stringify(toGeminiPayload(body)),
      });
    } catch (err) {
      throw new Error(
        `Não consegui falar com a API de IA: ${err instanceof Error ? err.message : "erro de rede"}`
      );
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      if (detail.includes("User location is not supported")) {
        throw new Error(
          "A API do Google não está disponível na região deste servidor. Use uma chave Z.ai (opção ao lado) ou tente novamente mais tarde."
        );
      }
      if (detail.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
        throw new Error(
          'O Google emitiu essa chave num formato que ainda não está liberado para a sua conta (bug conhecido da migração para chaves "AQ."). Crie outra chave no AI Studio ou use a opção Z.ai.'
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `A IA recusou a chave (${response.status}). Confira se a chave está correta e ativa. Detalhe: ${detail}`
        );
      }
      if (response.status === 429) {
        throw new Error(
          "A IA atingiu o limite de uso desta chave agora (429). Aguarde alguns segundos e tente de novo."
        );
      }
      if (detail.includes("valid API key") || detail.includes("API key not valid")) {
        throw new Error(
          'O Google não reconheceu essa chave. Confira se copiou a chave completa (começa com "AIza" ou "AQ.") e se ela está ativa no AI Studio.'
        );
      }
      if (response.status === 404 || detail.includes("is not found")) {
        throw new Error(
          "A sua conta Google ainda não tem acesso aos modelos usados pelo app (a Google está migrando os formatos de chave). Tente novamente em alguns minutos ou use a opção Z.ai."
        );
      }
      throw new Error(`API de IA falhou (${response.status}): ${detail}`);
    }
    const data = (await response.json()) as GeminiResponse;
    const content = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!content) {
      throw new Error("A IA do Google respondeu vazia. Tente novamente.");
    }
    return { choices: [{ message: { content } }] };
  }

  /** Conclusão de chat textual (análise pedagógica). */
  async create(body: ChatBody): Promise<ZaiChatResponse> {
    return this.runWithFallback("chat", body);
  }

  /** Conclusão multimodal (OCR/extração de questão). */
  async createVision(body: ChatBody): Promise<ZaiChatResponse> {
    return this.runWithFallback("vision", body);
  }
}

/** Detecta erro de modelo indisponível/sem permissão para tentar o próximo da cadeia. */
function isModelUnavailable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (!msg.includes("model") && !msg.includes("modelo")) return false;
  return (
    msg.includes("not exist") ||
    msg.includes("does not exist") ||
    msg.includes("não existe") ||
    msg.includes("nao existe") ||
    msg.includes("not found") ||
    msg.includes("invalid model") ||
    msg.includes("deprecated") ||
    msg.includes("unavailable") ||
    msg.includes("no longer available") || // "model is no longer available to new users" (Google, 2026)
    msg.includes("no permission to access") ||
    msg.includes("1211") // código da plataforma para modelo indisponível
  );
}

export async function getZai(override?: AiOverride): Promise<ZaiClient> {
  let resolved = resolve(override);
  if (!resolved) {
    const cfg = await configFromFile();
    if (cfg) resolved = { cfg, mode: isInternalMode(cfg) ? "internal" : "open", provider: "zai" };
  }
  if (!resolved) {
    throw new Error(
      "IA não configurada: conecte sua própria chave grátis na seção \"Sua chave de IA\" no início da página, ou defina ZAI_API_KEY no servidor."
    );
  }
  return new ZaiClient(resolved);
}
