// Acesso pago no cliente: token assinado guardado no localStorage do aparelho.

const KEY = "dp-access";

export interface StoredAccess {
  token: string;
  email: string;
  plan: string;
  expiresAt: string;
}

export function getStoredAccess(): StoredAccess | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAccess;
    if (!parsed?.token) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredAccess(access: StoredAccess): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(access));
  } catch {
    // storage indisponível
  }
}

export function clearStoredAccess(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // idem
  }
}

export function authHeaders(): Record<string, string> {
  const access = getStoredAccess();
  return access ? { "x-access-token": access.token } : {};
}

// Chamado quando uma API responde 401: limpa o acesso local e recarrega
// para que a tela de bloqueio (AccessGate) apareça.
export function handleAccessDenied(): void {
  clearStoredAccess();
  window.location.reload();
}

export async function verifyAccessRemote(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/access/check", { headers: { "x-access-token": token } });
    return res.ok;
  } catch {
    return false;
  }
}
