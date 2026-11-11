// Cliente unificado da API z-ai.
// Funciona em dois ambientes sem mudar o código das rotas:
//  - Sandbox/local: arquivo .z-ai-config (cwd, home ou /etc) — igual ao SDK oficial
//  - Produção (Vercel): variáveis de ambiente ZAI_API_KEY (+ opcionais)
//
// Modo "internal" (gateway interno): usa /chat/completions/vision para visão.
// Modo "open" (api.z.ai pública): usa /chat/completions multimodal e injeta model.
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

const DEFAULT_OPEN_BASE = "https://api.z.ai/api/paas/v4";
const DEFAULT_MODEL = "glm-4.6";
const DEFAULT_VISION_MODEL = "glm-4.5v";

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

type ChatBody = {
  messages?: unknown;
  thinking?: { type: "enabled" | "disabled" };
  model?: string;
  stream?: boolean;
  [key: string]: unknown;
};

class ZaiClient {
  public readonly chat: {
    completions: {
      create: (body: ChatBody) => Promise<ZaiChatResponse>;
      createVision: (body: ChatBody) => Promise<ZaiChatResponse>;
    };
  };

  constructor(private readonly cfg: ZaiConfig) {
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
      Authorization: `Bearer ${this.cfg.apiKey}`,
      "X-Z-AI-From": "Z",
    };
    if (this.cfg.chatId) headers["X-Chat-Id"] = this.cfg.chatId;
    if (this.cfg.userId) headers["X-User-Id"] = this.cfg.userId;
    if (this.cfg.token) headers["X-Token"] = this.cfg.token;
    return headers;
  }

  private async post(pathname: string, body: ChatBody): Promise<ZaiChatResponse> {
    const url = `${this.cfg.baseUrl}${pathname}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(
        `Não consegui falar com a API de IA (${url}): ${err instanceof Error ? err.message : "erro de rede"}`
      );
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Credenciais da IA recusadas (${res.status}). Verifique ZAI_API_KEY / ZAI_API_TOKEN. Detalhe: ${detail}`
        );
      }
      throw new Error(`API de IA falhou (${res.status}): ${detail}`);
    }
    return (await res.json()) as ZaiChatResponse;
  }

  /** Conclusão de chat textual (análise pedagógica). */
  async create(body: ChatBody): Promise<ZaiChatResponse> {
    const payload: ChatBody = { thinking: { type: "disabled" }, ...body };
    if (!isInternalMode(this.cfg) && !payload.model) {
      payload.model = envTrim("ZAI_MODEL") ?? DEFAULT_MODEL;
    }
    return this.post("/chat/completions", payload);
  }

  /** Conclusão multimodal (OCR/extração de questão). */
  async createVision(body: ChatBody): Promise<ZaiChatResponse> {
    const payload: ChatBody = { thinking: { type: "disabled" }, ...body };
    const internal = isInternalMode(this.cfg);
    if (!internal && !payload.model) {
      payload.model = envTrim("ZAI_MODEL_VISION") ?? DEFAULT_VISION_MODEL;
    }
    const pathname = internal ? "/chat/completions/vision" : "/chat/completions";
    return this.post(pathname, payload);
  }
}

export async function getZai(): Promise<ZaiClient> {
  const cfg = configFromEnv() ?? (await configFromFile());
  if (!cfg) {
    throw new Error(
      "IA não configurada neste servidor: defina a variável de ambiente ZAI_API_KEY (e, se necessário, ZAI_API_BASE/ZAI_MODEL) ou forneça o arquivo .z-ai-config."
    );
  }
  return new ZaiClient(cfg);
}
