// Store client-side da chave de IA do usuário (BYOK).
// A chave vive APENAS no localStorage do navegador — o servidor usa-a
// por requisição para chamar a IA e nunca a armazena.
export type UserAiProvider = "google" | "zai";

export interface UserAiConfig {
  provider: UserAiProvider;
  key: string;
}

const STORAGE_KEY = "dp-user-ai";
const EVENT = "dp-user-ai-change";

let cached: UserAiConfig | null | undefined;

function parse(raw: string): UserAiConfig | null {
  try {
    const data = JSON.parse(raw) as { provider?: unknown; key?: unknown };
    if (
      (data.provider === "google" || data.provider === "zai") &&
      typeof data.key === "string" &&
      data.key.trim().length > 0
    ) {
      return { provider: data.provider, key: data.key.trim() };
    }
  } catch {
    // JSON inválido no storage — trata como ausente
  }
  return null;
}

function refresh(): UserAiConfig | null {
  if (typeof window === "undefined") return null;
  try {
    cached = parse(window.localStorage.getItem(STORAGE_KEY) ?? "");
  } catch {
    cached = null;
  }
  return cached;
}

export function getUserAi(): UserAiConfig | null {
  return cached === undefined ? refresh() : cached;
}

export function saveUserAi(cfg: UserAiConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: cfg.provider, key: cfg.key.trim() }));
  } catch {
    // storage indisponível (modo privado etc.)
  }
  refresh();
  window.dispatchEvent(new Event(EVENT));
}

export function clearUserAi(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem
  }
  refresh();
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeUserAi(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export const getUserAiServerSnapshot = (): UserAiConfig | null => null;
