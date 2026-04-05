import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import type { AttemptFeedback } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const { errorId, selectedAnswer, answerText, confidence } = (await request.json()) as {
      errorId?: string;
      selectedAnswer?: string;
      answerText?: string;
      confidence?: number;
    };

    if (!errorId || (!selectedAnswer && !answerText)) {
      return NextResponse.json({ error: "Envie a questao e a resposta do aluno." }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: errorRecord, error } = await admin
      .from("errors")
      .select("id, user_id, correct_answer, correct_option_explanation, theme, theoretical_summary")
      .eq("id", errorId)
      .eq("user_id", user.id)
      .single();

    if (error || !errorRecord) {
      return NextResponse.json({ error: "Questao nao encontrada." }, { status: 404 });
    }

    const normalizedSelected = selectedAnswer?.trim().toUpperCase() || null;
    const normalizedCorrect = errorRecord.correct_answer?.trim().toUpperCase() || null;
    const isCorrect = normalizedSelected && normalizedCorrect ? normalizedSelected === normalizedCorrect : null;

    const feedback: AttemptFeedback = isCorrect
      ? {
          verdict: "correct",
          headline: "Boa. Voce acertou a alternativa correta.",
          recommendation: "Revise o resumo teorico e resolva a questao semelhante para fixar o padrao.",
        }
      : {
          verdict: "incorrect",
          headline: "Ainda ha um gap neste tema.",
          recommendation:
            errorRecord.correct_option_explanation ||
            errorRecord.theoretical_summary ||
            "Revise a explicacao da alternativa correta e refaca a questao semelhante.",
        };

    const { error: insertError } = await admin.from("question_attempts").insert({
      user_id: user.id,
      error_id: errorId,
      selected_answer: normalizedSelected,
      answer_text: answerText || null,
      is_correct: isCorrect,
      confidence: confidence || null,
      feedback,
    });

    if (insertError) {
      throw insertError;
    }

    const { error: updateError } = await admin
      .from("errors")
      .update({
        submitted_answer: normalizedSelected || answerText || null,
        submitted_answer_is_correct: isCorrect,
      })
      .eq("id", errorId)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ isCorrect, feedback });
  } catch (error) {
    console.error("submit-answer", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
