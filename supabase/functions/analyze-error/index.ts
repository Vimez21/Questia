import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!supabaseKey) throw new Error("No supabase anon key found");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { questionText, imageUrl, specialty, subtopic, examBoard, errorType, markedAnswer, correctAnswer, userComment } = await req.json();

    if (!questionText && !imageUrl) {
      return new Response(JSON.stringify({ error: "questionText or imageUrl is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um tutor de medicina para residência médica no Brasil. Fale de forma direta, natural e humana — como um professor explicando para um amigo. NUNCA use frases genéricas de IA como "Vamos lá!", "Ótima pergunta!", "É importante ressaltar que..." ou qualquer frase motivacional vazia. Vá direto ao ponto.

Analise a questão e retorne APENAS um JSON válido (sem markdown, sem code blocks) com esta estrutura:
{
  "alternativa_correta": "Letra X) texto da alternativa correta",
  "resumo_erro": "Explique em 2-3 frases simples o que o aluno errou e por quê, como se estivesse conversando com ele",
  "tipo_erro": "conceitual | interpretação | distrator | desatenção | conhecimento_insuficiente",
  "ponto_chave": "O conceito-chave que resolve essa questão, explicado de forma memorável e prática",
  "padrao_prova": "Como esse tema cai em prova: pegadinhas comuns, palavras-chave que a banca usa, armadilhas frequentes",
  "desmontagem": [
    {
      "alternativa": "A) texto da alternativa",
      "status": "correta | incorreta",
      "explicacao": "Por que está certa ou errada, de forma curta e clara",
      "dica": "Macete ou associação prática para lembrar (ex: 'quando a questão falar X, pense em Y')"
    }
  ],
  "pontos_cobrados": ["ponto 1", "ponto 2", "ponto 3"],
  "flashcards": [
    {"front": "Pergunta objetiva e direta", "back": "Resposta curta e memorável, com macete se possível"},
    {"front": "Pergunta 2", "back": "Resposta 2"},
    {"front": "Pergunta 3", "back": "Resposta 3"}
  ]
}

REGRAS DE LINGUAGEM:
- Frases curtas e diretas. Sem enrolação.
- Use linguagem de quem estuda medicina de verdade: "o pulo do gato aqui é...", "a banca adora cobrar isso porque...", "macete: ..."
- Na desmontagem, CADA alternativa deve ser um objeto separado no array, com explicação e dica própria
- Foque em ensinar o aluno a RECONHECER o padrão da questão e acertar na próxima vez
- Inclua macetes, mnemonics e associações práticas sempre que possível
- Se receber uma imagem, transcreva o texto da questão primeiro e depois analise`;

    const contextParts = [];
    if (questionText) contextParts.push(`Questão: ${questionText}`);
    contextParts.push(`Especialidade: ${specialty || "Não informada"}`);
    contextParts.push(`Subtema: ${subtopic || "Não informado"}`);
    contextParts.push(`Banca: ${examBoard || "Não informada"}`);
    contextParts.push(`Tipo de erro: ${errorType === "wrong" ? "Errou" : errorType === "guess" ? "Acertou por chute" : errorType === "doubt" ? "Ficou em dúvida" : "Não informado"}`);
    contextParts.push(`Alternativa marcada: ${markedAnswer || "Não informada"}`);
    contextParts.push(`Alternativa correta: ${correctAnswer || "Não informada"}`);
    contextParts.push(`Raciocínio do aluno: ${userComment || "Não informado"}`);

    const userPromptText = contextParts.join("\n");

    // Build messages - use multimodal if image provided
    const userContent: any[] = [];
    
    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
      userContent.push({
        type: "text",
        text: `Transcreva o texto completo desta imagem de questão médica e depois analise:\n\n${userPromptText}`,
      });
    } else {
      userContent.push({
        type: "text",
        text: userPromptText,
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageUrl ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { resumo_erro: content, flashcards: [] };
    }

    // Save error to DB
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { data: errorRecord, error: insertError } = await serviceClient
      .from("errors")
      .insert({
        user_id: user.id,
        question_text: questionText || (analysis.transcricao || "Questão enviada por imagem"),
        specialty: specialty || null,
        subtopic: subtopic || null,
        exam_board: examBoard || null,
        error_type: errorType || null,
        marked_answer: markedAnswer || null,
        correct_answer: correctAnswer || null,
        user_comment: userComment || null,
        ai_analysis: analysis,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Save flashcards
    const flashcards = analysis.flashcards || [];
    if (flashcards.length > 0) {
      const flashcardRows = flashcards.map((fc: { front: string; back: string }) => ({
        user_id: user.id,
        error_id: errorRecord.id,
        front: fc.front,
        back: fc.back,
      }));
      await serviceClient.from("flashcards").insert(flashcardRows);
    }

    return new Response(JSON.stringify({ analysis, errorId: errorRecord.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
