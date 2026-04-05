import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { runStructuredChatCompletion } from "@/lib/server/openai";
import type { FlashcardSeed } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 30;

const flashcardsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["flashcards"],
  properties: {
    flashcards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["front", "back"],
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
      },
    },
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

    const existing = await admin.from("flashcards").select("front").eq("error_id", errorId).eq("user_id", user.id);
    const existingFronts = (existing.data || []).map((item) => item.front).join("\n");

    const parsed = await runStructuredChatCompletion<{ flashcards: FlashcardSeed[] }>({
      schemaName: "extra_flashcards",
      schema: flashcardsSchema,
      system: "Crie exatamente 3 flashcards objetivos, sem repetir cards existentes e sem texto desnecessario.",
      user: [
        `Tema: ${errorRecord.theme || "Nao informado"}`,
        `Questao: ${errorRecord.question_text || "Nao informada"}`,
        `Resumo teorico: ${errorRecord.theoretical_summary || "Nao informado"}`,
        `Flashcards ja existentes:\n${existingFronts || "Nenhum"}`,
      ].join("\n\n"),
      temperature: 0.4,
    });

    if (parsed.flashcards.length > 0) {
      const { error: insertError } = await admin.from("flashcards").insert(
        parsed.flashcards.map((flashcard) => ({
          user_id: user.id,
          error_id: errorId,
          front: flashcard.front,
          back: flashcard.back,
        })),
      );

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ flashcards: parsed.flashcards });
  } catch (error) {
    console.error("generate-flashcards", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
