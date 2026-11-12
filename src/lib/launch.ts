// Estratégia de lançamento: acesso 100% grátis por tempo limitado.
// A decisão de liberar é SEMPRE calculada no servidor (rotas /api/launch e
// rotas de IA) — à prova de relógio do aparelho do usuário.
//
// Encerramento: 01/01/2027 00:00, horário de Brasília (UTC-3).

export const LAUNCH_FREE_UNTIL_ISO = "2027-01-01T00:00:00-03:00";
export const LAUNCH_FREE_UNTIL_MS = new Date(LAUNCH_FREE_UNTIL_ISO).getTime();

/** true enquanto estivermos dentro da janela de lançamento gratuito. */
export function isLaunchFreeNow(now: number = Date.now()): boolean {
  return now < LAUNCH_FREE_UNTIL_MS;
}

export const LAUNCH_LABEL = "Acesso grátis de lançamento";
export const LAUNCH_DEADLINE_LABEL = "01/01/2027";
