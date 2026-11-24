// @vitest-environment node

import { describe, expect, it } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { parseUpload } from "../../../src/lib/evidence/parse-upload";
import { createPdf } from "./pdf-fixture";

function pdfFile(bytes: Buffer, name = "evidencia.pdf") {
  return new File([bytes], name, { type: "application/pdf" });
}

describe("PDF parser", () => {
  it("extracts selectable text with page references", async () => {
    const result = await parseUpload(pdfFile(createPdf("Demora sintetica")));

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      sourceType: "pdf",
      locator: "Página 1",
      excerpt: "Demora sintetica",
    });
  });

  it("reports scanned PDFs without applying OCR and rejects malformed files", async () => {
    const scanned = pdfFile(createPdf(""));
    const malformed = pdfFile(Buffer.from("not a PDF"));

    await expect(parseUpload(scanned)).rejects.toMatchObject<EvidenceError>({
      code: "UNREADABLE_FILE",
    });
    await expect(parseUpload(malformed)).rejects.toMatchObject<EvidenceError>({
      code: "INVALID_FILE",
    });
  });
});
