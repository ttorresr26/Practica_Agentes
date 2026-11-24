// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { parseUpload } from "../../../src/lib/evidence/parse-upload";
import { validateFileSet } from "../../../src/lib/evidence/validate-upload";
import { MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_FILE_BYTES } from "../../../src/lib/evidence/limits";

const fixturesDirectory = join(process.cwd(), "tests/fixtures/synthetic");

describe("upload validation", () => {
  it("rejects unsupported extensions and mismatched MIME types", () => {
    const unsupported = new File(["sample"], "archivo.exe", { type: "application/octet-stream" });
    const mismatched = new File(["sample"], "archivo.csv", { type: "application/pdf" });

    expect(() => validateFileSet([unsupported])).toThrowError(EvidenceError);
    expect(() => validateFileSet([mismatched])).toThrowError(EvidenceError);
  });

  it("enforces count, per-file size and aggregate size limits", () => {
    const tooLarge = new File([new Uint8Array(MAX_FILE_BYTES + 1)], "large.csv", { type: "text/csv" });
    const manyFiles = Array.from({ length: MAX_FILES + 1 }, (_, index) =>
      new File(["a"], `file-${index}.csv`, { type: "text/csv" }),
    );
    const halfLimit = Math.ceil(MAX_TOTAL_FILE_BYTES / 2);
    const tooMuchTotal = [
      new File([new Uint8Array(halfLimit)], "one.csv", { type: "text/csv" }),
      new File([new Uint8Array(halfLimit)], "two.csv", { type: "text/csv" }),
    ];

    expect(() => validateFileSet([tooLarge])).toThrowError(EvidenceError);
    expect(() => validateFileSet(manyFiles)).toThrowError(EvidenceError);
    expect(() => validateFileSet(tooMuchTotal)).toThrowError(EvidenceError);
  });

  it("rejects office archives containing macros, embedded media, or excessive expansion", async () => {
    const unsafeFixtures = [
      ["contiene-macro.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["contiene-imagen.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["expansion-excesiva.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ] as const;

    for (const [fileName, type] of unsafeFixtures) {
      const bytes = await readFile(join(fixturesDirectory, fileName));
      const file = new File([bytes], fileName, { type });
      await expect(parseUpload(file)).rejects.toMatchObject<EvidenceError>({
        code: "INVALID_FILE",
      });
    }
  });
});
