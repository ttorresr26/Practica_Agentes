import { describe, expect, it } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { addSource, createParseResult } from "../../../src/lib/evidence/normalize";
import { MAX_EVIDENCE_SOURCES } from "../../../src/lib/evidence/limits";

describe("evidence normalization limits", () => {
  it("rejects rather than silently truncating after the source-count limit", () => {
    const result = createParseResult();
    const source = {
      fileName: "datos.csv",
      sourceType: "csv" as const,
      locator: "Fila",
      excerpt: "x",
    };

    for (let index = 0; index < MAX_EVIDENCE_SOURCES; index += 1) {
      addSource(result, source);
    }

    expect(() => addSource(result, source)).toThrowError(EvidenceError);
  });
});
