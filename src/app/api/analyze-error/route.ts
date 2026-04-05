import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { buildAttachmentContext } from "@/lib/server/attachments";
import { runStructuredChatCompletion } from "@/lib/server/openai";
import type { QuestionAnalysis } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "question_summary",
    "theme",
    "difficulty",
    "correct_alternative",
    "correct_option_explanation",
    "wrong_options_explanations",
    "theoretical_summary",
    "study_takeaways",
    "flashcards",
    "similar_question",
  ],
  properties: {
    question_summary: { type: "string" },
    theme: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    correct_alternative: { type: "string" },
    correct_option_explanation: { type: "string" },
    wrong_options_explanations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["alternative", "explanation", "misconception"],
        properties: {
          alternative: { type: "string" },
          explanation: { type: "string" },
          misconception: { type: "string" },
        },
      },
    },
    theoretical_summary: { type: "string" },
    study_takeaways: {
      type: "array",
      items: { type: "string" },
    },
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
    similar_question: {
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
    },
  },
} as const;

type RequestBody = {
  title?: string;
  questionText?: string;
  specialty?: string;
  subtopic?: string;
  examBoard?: string;
  errorType?: string;
  markedAnswer?: string;
  correctAnswer?: string;
  userComment?: string;
  sourceType?: "text" | "image" | "pdf";
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const body = (await request.json()) as RequestBody;

    if (!body.questionText?.trim() && !body.attachmentPath) {
      return NextResponse.json({ error: "Envie o texto da questao ou um anexo." }, { status: 400 });
    }

    const attachment = await buildAttachmentContext({
      attachmentPath: body.attachmentPath,
      attachmentMimeType: body.attachmentMimeType,
    });

    const contentBlocks = [
      {
        type: "text",
        text: [
          "Analise uma questao de prova para residencia medica no Brasil.",
          "Retorne somente JSON valido no schema informado.",
          "",
          `Titulo: ${body.title || "Questao de estudo"}`,
          `Texto da questao: ${body.questionText || "Nao informado"}`,
          `Texto extraido do anexo: ${attachment.extractedText || "Nao aplicavel"}`,
          `Especialidade: ${body.specialty || "Nao informada"}`,
          `Subtopico: ${body.subtopic || "Nao informado"}`,
          `Banca: ${body.examBoard || "Nao informada"}`,
          `Tipo de erro do aluno: ${body.errorType || "Nao informado"}`,
          `Alternativa marcada: ${body.markedAnswer || "Nao informada"}`,
          `Alternativa correta informada: ${body.correctAnswer || "Nao informada"}`,
          `Comentario do aluno: ${body.userComment || "Nao informado"}`,
          "",
          "Objetivos obrigatorios:",
          "1. Analisar a questao.",
          "2. Explicar a alternativa correta.",
          "3. Explicar por que as alternativas erradas estao erradas.",
          "4. Gerar resumo teorico.",
          "5. Gerar flashcards curtos e objetivos.",
          "6. Gerar uma questao semelhante.",
          "7. Classificar dificuldade e tema.",
        ].join("\n"),
      },
      ...attachment.promptParts,
    ];

    const analysis = await runStructuredChatCompletion<QuestionAnalysis>({
      schemaName: "question_analysis",
      schema: analysisSchema,
      system:
        "Voce e um tutor premium para residencia medica. Seja preciso, didatico, focado em prova e sem floreios.",
      user: contentBlocks,
      temperature: 0.2,
    });

    const admin = getSupabaseAdminClient();
    const { data: errorRecord, error: insertError } = await admin
      .from("errors")
      .insert({
        user_id: user.id,
        title: body.title || null,
        question_text: body.questionText?.trim() || attachment.extractedText || null,
        specialty: body.specialty || null,
        subtopic: body.subtopic || analysis.theme || null,
        exam_board: body.examBoard || null,
        error_type: body.errorType || null,
        marked_answer: body.markedAnswer || null,
        correct_answer: body.correctAnswer || analysis.correct_alternative || null,
        user_comment: body.userComment || null,
        source_type: body.sourceType || "text",
        attachment_path: body.attachmentPath || null,
        attachment_name: body.attachmentName || null,
        attachment_mime_type: body.attachmentMimeType || null,
        attachment_size_bytes: body.attachmentSizeBytes || null,
        status: "analyzed",
        difficulty: analysis.difficulty,
        theme: analysis.theme,
        theoretical_summary: analysis.theoretical_summary,
        correct_option_explanation: analysis.correct_option_explanation,
        wrong_options_explanations: analysis.wrong_options_explanations,
        similar_question: analysis.similar_question,
        ai_analysis: analysis,
        ai_model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        last_analyzed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !errorRecord) {
      throw insertError || new Error("Nao foi possivel salvar a analise.");
    }

    if (analysis.flashcards.length > 0) {
      const { error: flashcardError } = await admin.from("flashcards").insert(
        analysis.flashcards.map((flashcard) => ({
          user_id: user.id,
          error_id: errorRecord.id,
          front: flashcard.front,
          back: flashcard.back,
        })),
      );

      if (flashcardError) {
        throw flashcardError;
      }
    }

    return NextResponse.json({
      errorId: errorRecord.id,
      analysis,
    });
  } catch (error) {
    console.error("analyze-error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
