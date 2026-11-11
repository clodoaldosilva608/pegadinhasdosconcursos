import type { AnalysisResult, ExtractedQuestion } from "./types";

export function stripJsonFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  const first = text.search(/[[{]/);
  if (first > 0) text = text.slice(first);
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (lastBrace !== -1) text = text.slice(0, lastBrace + 1);
  return text.trim();
}

/**
 * Repara JSON "quase válido" gerado por LLMs: quebras de linha (\n, \r) e
 * tabs crus dentro de valores de string, que o JSON.parse estrito rejeita.
 * Percorre caractere a caractere, respeitando strings e escapes existentes.
 */
export function repairJsonText(raw: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (ch === "\\") {
        // preserva sequência de escape já existente (ex.: \\\" , \\\\n)
        out += ch + (raw[i + 1] ?? "");
        i++;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

export function safeParse<T>(raw: string): T | null {
  const text = stripJsonFences(raw);
  try {
    return JSON.parse(text) as T;
  } catch {
    // 2ª tentativa: repara caracteres de controle crus dentro de strings
    try {
      return JSON.parse(repairJsonText(text)) as T;
    } catch {
      return null;
    }
  }
}

export const EXTRACT_SYSTEM_PROMPT = `Você é um leitor óptico inteligente especializado em questões de concursos públicos brasileiros.
Sua tarefa é extrair, a partir de imagem(ns) ou texto de uma questão, um JSON estrito.

Regras:
- Transcreva o enunciado e TODAS as alternativas (A, B, C, D, E) fielmente, sem corrigir o conteúdo.
- Identifique a banca/organização (ex.: VUNESP, FGV, CESPE/CEBRASPE, INAZ, FCC, IBFC, CONSUPLAN,_avaliadora ou "Não identificada").
- Ignore elementos visuais que não pertençam à questão (cabeçalhos de navegador, cursor, marca d'água).
- Se houver mais de uma imagem, elas compõem UMA única questão (questão longa dividida em partes).
- Dentro dos valores de string do JSON, escreva quebras de linha como \\n (escape), nunca uma quebra de linha crua.
- Responda SOMENTE com JSON válido, sem texto ao redor.

Formato exato:
{
  "organization": "sigla da banca ou 'Não identificada'",
  "banca": "nome por extenso da banca",
  "year": "ano se visível, senão ''",
  "role": "cargo/área se visível, senão ''",
  "questionText": "texto completo do enunciado",
  "options": [{ "letter": "A", "text": "..." }, ...],
  "observations": "tabelas, imagens ou trechos que não couberem no enunciado, senão ''"
}`;

export const EXTRACT_USER_PROMPT = `Extraia a questão desta(s) imagem(ns) no formato JSON especificado.`;

export function buildExtractMessages(images: string[], notes?: string) {
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];
  const prompt = notes?.trim()
    ? `${EXTRACT_USER_PROMPT}\n\nObservações enviadas pelo usuário (podem conter o texto da questão digitado): "${notes.trim()}"`
    : EXTRACT_USER_PROMPT;
  content.push({ type: "text", text: prompt });
  for (const url of images) {
    content.push({ type: "image_url", image_url: { url } });
  }
  return [
    { role: "system" as const, content: EXTRACT_SYSTEM_PROMPT },
    { role: "user" as const, content },
  ];
}

export const ANALYZE_SYSTEM_PROMPT = `Você é o motor analítico do "Detector de Pegadinhas", a ferramenta que ensina candidatos de concurso a enxergar os DISTRATORES que as bancas plantam em cada alternativa e aprofunda o conteúdo pelo gabarito.

Você recebe: enunciado, alternativas, o gabarito oficial e a alternativa que o candidato marcou.
Você devolve UMA análise pedagógica completa em JSON estrito, em português brasileiro.

CONCEITOS QUE VOCÊ USA (classifique cada alternativa errada):
- "Conceito Vizinho": reproduz uma regra REAL, porém de outra situação/hipótese legal do que a pedida no enunciado.
- "Parcialdade / Meia-Verdade (Erro de Cauda)": começa correta e erra no final da frase (ou vice-versa).
- "Modalização Deôntica": troca/modifica o verbo ou modificador (deverá, poderá, será, é obrigatório, é facultativo, cabe...) alterando o regime jurídico.
- "Pressuposição Categórica": insere uma condição ou fato como se fosse certo, sem o enunciado sustentar.
- "Generalização / Universalização Indevida": usa "sempre", "nunca", "todos", "somente", "em qualquer hipótese" para além do alcance da regra.
- "Exceção Disfarçada": omite ou inventa exceções legais.
- "Inversão Causal": troca causa e efeito.
- "Atribuição de Competência Errada": desloca a competência para órgão/entidade incorreta.
Use o nome mais adequado entre estes (ou um nome igualmente preciso e curto) e explique em uma frase por que ele pega o candidato.

OPERADORES SEMÂNTICOS: aponte a palavra, o verbo, o prefixo ou o conector que EXECUTA a pegadinha em cada alternativa (nem sempre é o conteúdo): modalização deôntica, pressuposição categórica, universalização, conectores adversativos, condicionais ocultas, negações, exclusões ("exceto", "salvo"). VOCABULÁRIO CEBRASPE: palavras como prescindível/imprescindível, prescindir, defeso, eventual, eventualmente, contemporâneo, sobretudo, precipuamente, preponderante, meramente, mitigar, obstar, deflagrar, suscitar, exaurir, inequívoco, plausível, congruente, análogo, inerente, divergir, ratificar, retratar-se, intransigente, aludir, abster-se, tacitamente, ab-rogar, derrogar, concomitante, hodierno, sucessivamente, "sine qua non", "a priori", "a posteriori", "ad hoc", "de jure" e "de facto" são clássicas da banca — quando aparecerem no enunciado ou nas alternativas, trate-as como operadores semânticos: cite o trecho exato, dê o significado preciso da palavra e explique como ela muda o sentido da frase. Para cada operador, cite o trecho exato entre aspas e explique o efeito dele.

REGRAS DE ESTILO:
- Linguagem direta, acolhedora e didática, falando com o candidato ("você").
- Explique o conteúdo jurídico/técnico de verdade, citando o dispositivo legal quando aplicável (ex.: art. 38 da CF).
- NUNCA invente dispositivos legais; se não tiver certeza do número, refira-se à norma sem número.
- Destaque no máximo 3 "trapPhrases" por alternativa: os trechos exatos (cópias fiéis de palavras contíguas da alternativa, entre 2 e 8 palavras) onde a pegadinha mora. Numere-as sequencialmente por questão (anchor 1, 2, 3...).
- "trapPhrases" de uma alternativa correta pode ser vazia ([]) ou apontar o trecho que a valida.
- Se o candidato ACERTOU, "whyMarkedSeemedCorrect" vira um parabém + reforço do raciocínio, e "trapLocation.explicacao" indica qual armadilha quase pegou.
- "examTip": uma dica prática e específica para questões parecidas na prova.
- Dentro dos valores de string do JSON, escreva quebras de linha como \\n (escape), nunca uma quebra de linha crua.
- Responda SOMENTE com JSON válido, sem texto ao redor.

Formato exato:
{
  "banca": "nome por extenso da banca",
  "organization": "sigla (ex.: VUNESP)",
  "year": "ano ou ''",
  "questionText": "enunciado fiel",
  "options": [
    {
      "letter": "A",
      "text": "texto fiel da alternativa",
      "isCorrect": false,
      "isUserMarked": true,
      "trapPhrases": [{ "text": "trecho exato da alternativa", "anchor": 1 }],
      "distractorType": "Conceito Vizinho" | null
    }
  ],
  "trapLocation": {
    "distratorNome": "nome do distrator que pegou o candidato",
    "explicacao": "ONDE está a pegadinha: citando a letra e a expressão exata, explicando a armadilha em 2-3 frases"
  },
  "whyYouErred": {
    "markedLetter": "A",
    "correctLetter": "C",
    "whyMarkedSeemedCorrect": "por que a alternativa marcada PARECEU correta (o raciocínio que a banca explorou), 3-5 frases",
    "whyCorrectIsCorrect": "por que a alternativa correta É a correta, aprofundando o conteúdo, 3-5 frases"
  },
  "threeC": [
    {
      "letter": "A",
      "conteudo": "o conteúdo tratado na alternativa e o que há de errado nela",
      "distratorNome": "Conceito Vizinho",
      "distratorExplicacao": "como esse distrator foi montado nesta alternativa",
      "operadorSemantico": "qual operador/expressão executa a pegadinha aqui"
    }
  ],
  "semanticOperators": [
    {
      "nome": "Modalização Deôntica",
      "letter": "A",
      "quote": "trecho exato entre aspas",
      "explicacao": "efeito desse operador na alternativa"
    }
  ],
  "examTip": "dica prática para a prova"
}`;

export interface AnalyzeInput {
  questionText: string;
  options: Array<{ letter: string; text: string }>;
  correctLetter: string;
  userMarked: string;
  organization?: string;
  notes?: string;
}

export function buildAnalyzeMessages(input: AnalyzeInput) {
  const payload = {
    tarefa:
      "Analise esta questão de concurso e devolva o JSON de análise completo no formato especificado.",
    banca_reportada: input.organization || "Não identificada",
    enunciado: input.questionText,
    alternativas: input.options,
    gabarito_oficial: input.correctLetter,
    alternativa_marcada_pelo_candidato: input.userMarked || "nenhuma",
    observacoes_usuario: input.notes?.trim() || "",
  };
  return [
    { role: "system" as const, content: ANALYZE_SYSTEM_PROMPT },
    { role: "user" as const, content: JSON.stringify(payload, null, 2) },
  ];
}

const KNOWN_DISTRATORS = [
  "Conceito Vizinho",
  "Parcialdade / Meia-Verdade (Erro de Cauda)",
  "Parcialdade / Meia-Verdade",
  "Modalização Deôntica",
  "Pressuposição Categórica",
  "Generalização / Universalização Indevida",
  "Generalização Indevida",
  "Universalização Indevida",
  "Exceção Disfarçada",
  "Inversão Causal",
  "Atribuição de Competência Errada",
];

function extractDistratorName(
  explicacao: string,
  fallback: string | null
): { name: string; rest: string } {
  const trimmed = (explicacao ?? "").trim();
  for (const k of KNOWN_DISTRATORS) {
    if (trimmed.toLowerCase().startsWith(k.toLowerCase())) {
      const rest = trimmed
        .slice(k.length)
        .trim()
        .replace(/^[.:—–-]\s*/, "");
      return { name: k, rest };
    }
  }
  // Padrão "Nome Próprio. resto da frase"
  const m = trimmed.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}\p{N}'\/\- ]{3,48}?)[.:]\s+(.+)$/u);
  if (m) return { name: m[1].trim(), rest: m[2].trim() };
  return { name: "", rest: trimmed };
}

export function normalizeAnalysis(
  parsed: AnalysisResult,
  input: AnalyzeInput
): AnalysisResult {
  const options = (parsed.options ?? []).map((opt) => ({
    letter: (opt.letter ?? "").toUpperCase().slice(0, 1),
    text: opt.text ?? "",
    isCorrect: opt.isCorrect ?? opt.letter === input.correctLetter,
    isUserMarked: opt.isUserMarked ?? opt.letter === input.userMarked,
    trapPhrases: (opt.trapPhrases ?? []).slice(0, 3),
    distractorType: opt.distractorType ?? null,
  }));

  // Garante coerência de gabarito/marcações vindas do usuário
  for (const opt of options) {
    if (opt.letter === input.correctLetter) opt.isCorrect = true;
    else opt.isCorrect = false;
    if (input.userMarked && opt.letter === input.userMarked) opt.isUserMarked = true;
    else opt.isUserMarked = false;
  }

  let anchor = 1;
  for (const opt of options) {
    for (const tp of opt.trapPhrases) {
      tp.anchor = anchor++;
    }
  }

  return {
    banca: parsed.banca || input.organization || "Banca não identificada",
    organization: parsed.organization || input.organization || "",
    year: parsed.year ?? "",
    questionText: parsed.questionText || input.questionText,
    options,
    trapLocation: parsed.trapLocation ?? { distratorNome: "", explicacao: "" },
    whyYouErred: {
      markedLetter: input.userMarked || parsed.whyYouErred?.markedLetter || "",
      correctLetter: input.correctLetter || parsed.whyYouErred?.correctLetter || "",
      whyMarkedSeemedCorrect: parsed.whyYouErred?.whyMarkedSeemedCorrect ?? "",
      whyCorrectIsCorrect: parsed.whyYouErred?.whyCorrectIsCorrect ?? "",
    },
    threeC: (parsed.threeC ?? []).map((c) => {
      const letter = (c.letter ?? "").toUpperCase().slice(0, 1);
      const optType = options.find((o) => o.letter === letter)?.distractorType ?? null;
      let nome = (c.distratorNome ?? "").trim();
      let explicacao = (c.distratorExplicacao ?? "").trim();
      if (!nome) {
        const extracted = extractDistratorName(explicacao, optType);
        nome = extracted.name || optType || "Distrator";
        explicacao = extracted.rest || explicacao;
      }
      return {
        letter,
        conteudo: c.conteudo ?? "",
        distratorNome: nome,
        distratorExplicacao: explicacao,
        operadorSemantico: c.operadorSemantico ?? "",
      };
    }),
    semanticOperators: (parsed.semanticOperators ?? []).map((s) => ({
      ...s,
      letter: (s.letter ?? "").toUpperCase().slice(0, 1),
    })),
    examTip: parsed.examTip ?? "",
  };
}
