const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function runStructuredChatCompletion<T>({
  schemaName,
  schema,
  system,
  user,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  temperature = 0.3,
}: {
  schemaName: string;
  schema: Record<string, unknown>;
  system: string;
  user: string | Array<Record<string, unknown>>;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Falha ao chamar a OpenAI.");
  }

  return JSON.parse(payload.choices?.[0]?.message?.content || "{}") as T;
}
