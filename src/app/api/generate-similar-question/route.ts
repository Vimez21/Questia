import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { runStructuredChatCompletion } from "@/lib/server/anthropic";
import type { SimilarQuestion } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["prompt", "options", "correct_alternative", "explanation"],
  properties: {
    prompt: { type: "string" },
    options: {
      type: "array",
      items: { type: "string" },
    },
    correct_alternative: { type: "string" },
    explanation: { type: "string" },
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const { errorId } = (await request.json()) as { errorId?: string };

    if (!errorId) {
      return NextResponse.json({ error: "errorId e obrigatorio." }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: errorRecord, error } = await admin
      .from("errors")
      .select("id, question_text, theme, theoretical_summary, ai_analysis")
      .eq("id", errorId)
      .eq("user_id", user.id)
      .single();

    if (error || !errorRecord) {
      return NextResponse.json({ error: "Questao nao encontrada." }, { status: 404 });
    }

    const similarQuestion = await runStructuredChatCompletion<SimilarQuestion>({
      schemaName: "similar_question",
      schema,
      system: "Crie uma nova questao do mesmo tema, mesmo nivel e mesma logica de prova. Responda somente em JSON.",
      user: [
        `Tema: ${errorRecord.theme || "Nao informado"}`,
        `Questao base: ${errorRecord.question_text || "Nao informada"}`,
        `Resumo teorico: ${errorRecord.theoretical_summary || "Nao informado"}`,
      ].join("\n\n"),
      temperature: 0.5,
    });

    const { error: updateError } = await admin
      .from("errors")
      .update({ similar_question: similarQuestion })
      .eq("id", errorId)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ similarQuestion });
  } catch (error) {
    console.error("generate-similar-question", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
