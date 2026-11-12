// Identidade do aparelho no app (/app): um ID anônimo no localStorage permite
// o painel admin contar "Usuários do app" — cada aparelho que abre o app
// aparece na aba Usuários do app (plano, aparelho, 1ª/última visita).
// Sem e-mail obrigatório: se houver acesso pago verificado neste aparelho,
// o plano/e-mail vai junto no mesmo POST (fire-and-forget, sem bloquear UI).

import { getStoredAccess } from "@/lib/accessStore";

const KEY = "dp-device-id";

/** ID estável do aparelho (criado na primeira abertura). */
export function getOrCreateDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    // storage indisponível (modo privado restrito): ID volátil da sessão
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Registra/atualiza a visita do aparelho no painel (POST /api/app-track).
 * Fire-and-forget: falha é silenciosa — nunca bloqueia nem atrapalha o app.
 */
export function trackAppOpen(): void {
  try {
    const deviceId = getOrCreateDeviceId();
    const access = getStoredAccess();
    void fetch("/api/app-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        plan: access?.plan ?? "free",
        email: access?.email ?? "",
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // idem
  }
}
