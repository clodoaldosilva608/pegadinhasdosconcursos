// Temporada natalina do Detector de Pegadinhas (Task 18).
// Janela: 01/11 → 06/01 (Dia de Reis), no fuso de Brasília. Em 07/01 o site
// volta ao normal sozinho — sem aparecer "desatualizado" em fevereiro.
//
// Tudo é decidido pelo relógio do SERVIDOR (fuso America/Sao_Paulo), à prova
// do relógio do aparelho do usuário — mesma estratégia do lançamento gratuito.

export const CHRISTMAS_TZ = "America/Sao_Paulo";

/** Data "civil" de Brasília para um instante (formato en-CA: YYYY-MM-DD). */
export function brasiliaDate(now: number = Date.now()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHRISTMAS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  const [year, month, day] = parts.split("-").map(Number);
  return { year, month, day };
}

/**
 * true dentro da temporada natalina: 01/11 a 06/01 (inclusive), fuso de
 * Brasília. Em 07/01 (Dia de Reis já passado) desliga automaticamente.
 */
export function isChristmasSeason(now: number = Date.now()): boolean {
  const { month, day } = brasiliaDate(now);
  if (month === 11 || month === 12) return true; // novembro e dezembro inteiros
  if (month === 1) return day <= 6; // até 06/01 (Dia de Reis)
  return false;
}

/** true somente em dezembro (Brasília) — usado pela neve em modo "auto". */
export function isDecember(now: number = Date.now()): boolean {
  return brasiliaDate(now).month === 12;
}

/** Rótulo do fim da temporada (para o painel): "06/01". */
export const CHRISTMAS_SEASON_END_LABEL = "06/01";
