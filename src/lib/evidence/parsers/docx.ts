import { Buffer } from "node:buffer";
import mammoth from "mammoth";
import { EvidenceError } from "../errors";
import { addSource, createParseResult, normalizeText } from "../normalize";
import type { ValidatedUpload } from "../types";

export async function parseDocx(upload: ValidatedUpload) {
  let text: string;
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(upload.buffer) });
    text = normalizeText(result.value);
  } catch {
    throw new EvidenceError("INVALID_FILE");
  }

  if (!text) throw new EvidenceError("UNREADABLE_FILE");

  const result = createParseResult();
  const paragraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  paragraphs.forEach((paragraph, index) => {
    addSource(result, {
      fileName: upload.fileName,
      sourceType: "docx",
      locator: `Párrafo ${index + 1}`,
      excerpt: paragraph,
    });
  });
  return result;
}
