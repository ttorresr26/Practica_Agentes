// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { parseUpload } from "../../../src/lib/evidence/parse-upload";

const fixturesDirectory = join(process.cwd(), "tests/fixtures/synthetic");

describe("DOCX parser", () => {
  it("extracts paragraphs with document locators", async () => {
    const bytes = await readFile(join(fixturesDirectory, "resumen.docx"));
    const file = new File([bytes], "resumen.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const result = await parseUpload(file);

    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toMatchObject({
      sourceType: "docx",
      locator: "Párrafo 1",
      excerpt: "Síntesis de prueba",
    });
  });

  it("rejects empty and malformed DOCX files", async () => {
    const empty = new File([], "empty.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const malformed = new File(["not a zip"], "broken.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(parseUpload(empty)).rejects.toMatchObject<EvidenceError>({
      code: "EMPTY_FILE",
    });
    await expect(parseUpload(malformed)).rejects.toMatchObject<EvidenceError>({
      code: "INVALID_FILE",
    });
  });
});
