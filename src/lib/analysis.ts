import type { Json } from "@/lib/supabase/types";

export type WrongOptionExplanation = {
  alternative: string;
  explanation: string;
  misconception: string;
};

export type FlashcardSeed = {
  front: string;
  back: string;
};

export type SimilarQuestion = {
  prompt: string;
  options: string[];
  correct_alternative: string;
  explanation: string;
};

export type QuestionAnalysis = {
  question_summary: string;
  theme: string;
  difficulty: "easy" | "medium" | "hard";
  correct_alternative: string;
  correct_option_explanation: string;
  wrong_options_explanations: WrongOptionExplanation[];
  theoretical_summary: string;
  study_takeaways: string[];
  flashcards: FlashcardSeed[];
  similar_question: SimilarQuestion;
};

export type AttemptFeedback = {
  verdict: "correct" | "incorrect" | "partial";
  headline: string;
  recommendation: string;
};

export function parseQuestionAnalysis(value: Json | null): QuestionAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as unknown as QuestionAnalysis;
}

export function parseWrongOptions(value: Json | null): WrongOptionExplanation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as unknown as WrongOptionExplanation[];
}

export function parseSimilarQuestion(value: Json | null): SimilarQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as unknown as SimilarQuestion;
}
