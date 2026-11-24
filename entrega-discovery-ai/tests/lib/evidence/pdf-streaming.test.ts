// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { MAX_EXTRACTED_CHARACTERS } from "../../../src/lib/evidence/limits";
import { parsePdf } from "../../../src/lib/evidence/parsers/pdf";
import type { ValidatedUpload } from "../../../src/lib/evidence/types";

const mocks = vi.hoisted(() => ({
  streamTextContent: vi.fn(),
  getTextContent: vi.fn(),
  cleanupPage: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        streamTextContent: mocks.streamTextContent,
        getTextContent: mocks.getTextContent,
        cleanup: mocks.cleanupPage,
      }),
    }),
    destroy: mocks.destroy,
  }),
}));

const upload: ValidatedUpload = {
  buffer: Buffer.from("%PDF-1.4"),
  fileName: "evidencia.pdf",
  format: "pdf",
};

describe("PDF text extraction limits", () => {
  beforeEach(() => {
    mocks.streamTextContent.mockReset();
    mocks.getTextContent.mockReset().mockResolvedValue({
      items: [{ str: "x".repeat(MAX_EXTRACTED_CHARACTERS + 1) }],
    });
    mocks.cleanupPage.mockClear();
    mocks.destroy.mockClear();
  });

  it("cancels the text stream as soon as the remaining character limit is exceeded", async () => {
    let cancelled = false;
    mocks.streamTextContent.mockReturnValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue({
            items: [{ str: "x".repeat(MAX_EXTRACTED_CHARACTERS + 1) }],
          });
        },
        cancel() {
          cancelled = true;
        },
      }),
    );

    await expect(parsePdf(upload)).rejects.toMatchObject<EvidenceError>({
      code: "EXTRACTED_CONTENT_TOO_LARGE",
    });

    expect(mocks.streamTextContent).toHaveBeenCalledOnce();
    expect(mocks.getTextContent).not.toHaveBeenCalled();
    expect(cancelled).toBe(true);
    expect(mocks.cleanupPage).toHaveBeenCalledOnce();
  });
});
