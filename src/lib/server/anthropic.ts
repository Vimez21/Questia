import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, ContentBlockParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";

let anthropicClient: Anthropic | undefined;

function isNamedToolUseBlock(block: ContentBlock, schemaName: string): block is ToolUseBlock {
  return block.type === "tool_use" && block.name === schemaName;
}

function getAnthropicClient() {
  if (anthropicClient) {
    return anthropicClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY nao configurada.");
  }

  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

function normalizeUserContent(
  user: string | ContentBlockParam[] | Array<Record<string, unknown>>,
): string | ContentBlockParam[] {
  if (typeof user === "string") {
    return user;
  }

  return user as ContentBlockParam[];
}

export async function runStructuredChatCompletion<T>({
  schemaName,
  schema,
  system,
  user,
  model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  temperature = 0.3,
  maxTokens = 4096,
}: {
  schemaName: string;
  schema: {
    type: "object";
    [key: string]: unknown;
  };
  system: string;
  user: string | ContentBlockParam[] | Array<Record<string, unknown>>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [
      {
        role: "user",
        content: normalizeUserContent(user),
      },
    ],
    tools: [
      {
        name: schemaName,
        description: "Return the response using the required structured schema.",
        input_schema: schema,
      },
    ],
    tool_choice: {
      type: "tool",
      name: schemaName,
    },
  });

  const toolUseBlock = message.content.find((block) => isNamedToolUseBlock(block, schemaName));
  if (!toolUseBlock) {
    throw new Error("Claude nao retornou o bloco estruturado esperado.");
  }

  return toolUseBlock.input as T;
}
