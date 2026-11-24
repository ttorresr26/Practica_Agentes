// @vitest-environment node

import { describe, expect, it } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { assertSourcesArePermitted } from "../../../src/lib/evidence/sensitive-content";
import type { EvidenceSource } from "../../../src/lib/evidence/types";

function source(values: Record<string, string | number>): EvidenceSource {
  return {
    id: "S001",
    fileName: "datos.csv",
    sourceType: "csv",
    locator: "Fila 2",
    excerpt: Object.entries(values)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | "),
    values,
  };
}

describe("sensitive content checks", () => {
  it("does not join separate aggregated numeric cells into a card-like number", () => {
    expect(() =>
      assertSourcesArePermitted([
        source({
          transferencias: 1234567,
          reclamos: 2345678,
        }),
      ]),
    ).not.toThrow();
  });

  it("continues rejecting a long number contained in an individual value", () => {
    expect(() =>
      assertSourcesArePermitted([
        source({
          referencia: "1234567890123456",
        }),
      ]),
    ).toThrowError(EvidenceError);
  });
});
