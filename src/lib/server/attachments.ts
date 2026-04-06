import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { PDFParse } from "pdf-parse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AttachmentContext = {
  promptParts: ContentBlockParam[];
  extractedText: string | null;
};

export async function buildAttachmentContext({
  attachmentPath,
  attachmentMimeType,
}: {
  attachmentPath?: string | null;
  attachmentMimeType?: string | null;
}): Promise<AttachmentContext> {
  if (!attachmentPath) {
    return { promptParts: [], extractedText: null };
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage.from("question-files").download(attachmentPath);
  if (error || !data) {
    throw new Error("Nao foi possivel carregar o anexo salvo.");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const mimeType = attachmentMimeType || data.type || "application/octet-stream";

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return {
      promptParts: [],
      extractedText: parsed.text?.trim() || null,
    };
  }

  if (mimeType.startsWith("image/")) {
    const base64 = buffer.toString("base64");
    return {
      promptParts: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: base64,
          },
        },
      ],
      extractedText: null,
    };
  }

  return { promptParts: [], extractedText: null };
}
