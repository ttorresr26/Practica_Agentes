import { EvidenceError } from "./errors";
import { MAX_EVIDENCE_SOURCES, MAX_EXTRACTED_CHARACTERS } from "./limits";
import type { ParsedEvidenceSource, UploadParseResult } from "./types";

export function createParseResult(): UploadParseResult {
  return { sources: [], warnings: [], extractedCharacters: 0 };
}

export function addSource(result: UploadParseResult, source: ParsedEvidenceSource) {
  const extractedCharacters = source.excerpt.length;

  if (result.sources.length >= MAX_EVIDENCE_SOURCES) {
    throw new EvidenceError("TOO_MANY_SOURCES");
  }
  if (result.extractedCharacters + extractedCharacters > MAX_EXTRACTED_CHARACTERS) {
    throw new EvidenceError("EXTRACTED_CONTENT_TOO_LARGE");
  }
  result.sources.push(source);
  result.extractedCharacters += extractedCharacters;
}

export function normalizeHeaders(rawHeaders: string[]) {
  const used = new Map<string, number>();

  return rawHeaders.map((raw, index) => {
    const base = raw.trim() || `Columna ${index + 1}`;
    const occurrence = (used.get(base) ?? 0) + 1;
    used.set(base, occurrence);
    return occurrence === 1 ? base : `${base} (${occurrence})`;
  });
}

export function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
}
