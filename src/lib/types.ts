export interface ExtractedOption {
  letter: string;
  text: string;
}

export interface ExtractedQuestion {
  organization: string;
  banca: string;
  year: string;
  role: string;
  questionText: string;
  options: ExtractedOption[];
  observations: string;
}

export interface TrapPhrase {
  text: string;
  anchor: number;
}

export interface AnalyzedOption {
  letter: string;
  text: string;
  isCorrect: boolean;
  isUserMarked: boolean;
  trapPhrases: TrapPhrase[];
  distractorType: string | null;
}

export interface ThreeCBreakdown {
  letter: string;
  conteudo: string;
  distratorNome: string;
  distratorExplicacao: string;
  operadorSemantico: string;
}

export interface SemanticOperator {
  nome: string;
  letter: string;
  quote: string;
  explicacao: string;
}

export interface AnalysisResult {
  banca: string;
  organization: string;
  year: string;
  questionText: string;
  options: AnalyzedOption[];
  trapLocation: {
    distratorNome: string;
    explicacao: string;
  };
  whyYouErred: {
    markedLetter: string;
    correctLetter: string;
    whyMarkedSeemedCorrect: string;
    whyCorrectIsCorrect: string;
  };
  threeC: ThreeCBreakdown[];
  semanticOperators: SemanticOperator[];
  examTip: string;
}

export interface AccountInfo {
  planLabel: string;
  analysesLeft: number;
  noDeadline: boolean;
}

export type AppView = "home" | "confirm" | "analyzing" | "result";
export type MainTab = "analisar" | "distratores" | "vocabulario";
