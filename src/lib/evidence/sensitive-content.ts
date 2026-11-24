import { EvidenceError } from "./errors";
import type { EvidenceSource } from "./types";

const sensitivePatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?<!\d)(?:\+?593[\s-]?)?0?9(?:[\s-]?\d){8}(?!\d)/,
  /(?<!\d)\d{10,19}(?!\d)/,
  /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/,
  /\b\d{2}-\d{6}-\d{2}\b/,
  /\b(?:confidencial|confidential|uso interno|reservado)\b/i,
];

export function containsPotentialSensitiveContent(text: string) {
  return sensitivePatterns.some((pattern) => pattern.test(text));
}

export function assertSyntheticOrPublicContent(text: string) {
  if (containsPotentialSensitiveContent(text)) {
    throw new EvidenceError("SENSITIVE_CONTENT_DETECTED");
  }
}

export function assertSourcesArePermitted(sources: EvidenceSource[]) {
  for (const source of sources) {
    assertSyntheticOrPublicContent(source.excerpt);
    if (source.headers) assertSyntheticOrPublicContent(source.headers.join(" "));
    if (source.values) {
      Object.values(source.values).forEach((value) =>
        assertSyntheticOrPublicContent(String(value ?? "")),
      );
    }
  }
}
