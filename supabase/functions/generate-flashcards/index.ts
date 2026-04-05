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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { errorId, topic } = await req.json();
    if (!errorId || !topic) {
      return new Response(JSON.stringify({ error: "errorId and topic are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get existing flashcards to avoid duplicates
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await serviceClient
      .from("flashcards")
      .select("front")
      .eq("error_id", errorId);

    const existingFronts = (existing || []).map((f: { front: string }) => f.front).join("\n- ");

    const systemPrompt = `Você é um tutor especialista em medicina para provas de residência médica no Brasil. Gere 3 novos flashcards sobre o tema solicitado. Retorne APENAS um JSON válido (sem markdown, sem code blocks):
{
  "flashcards": [
    {"front": "Pergunta", "back": "Resposta"},
    {"front": "Pergunta 2", "back": "Resposta 2"},
    {"front": "Pergunta 3", "back": "Resposta 3"}
  ]
}
NÃO repita flashcards já existentes.`;

    const userPrompt = `Tema: ${topic}
Flashcards já existentes (não repetir):
- ${existingFronts || "Nenhum"}

Gere 3 novos flashcards diferentes e complementares sobre esse tema.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { flashcards: [] };
    }

    const flashcards = parsed.flashcards || [];
    if (flashcards.length > 0) {
      const rows = flashcards.map((fc: { front: string; back: string }) => ({
        user_id: user.id,
        error_id: errorId,
        front: fc.front,
        back: fc.back,
      }));
      await serviceClient.from("flashcards").insert(rows);
    }

    return new Response(JSON.stringify({ flashcards }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-flashcards:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
