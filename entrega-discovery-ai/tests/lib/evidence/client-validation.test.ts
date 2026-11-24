import { describe, expect, it } from "vitest";
import { getClientFileError } from "../../../src/lib/evidence/client-validation";
import { MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_FILE_BYTES } from "../../../src/lib/evidence/limits";

function metadata(name: string, size: number, type = "text/csv") {
  return { name, size, type };
}

describe("client upload validation", () => {
  it("rejects unsupported extensions and mismatched MIME types", () => {
    expect(getClientFileError([metadata("datos.exe", 10, "application/octet-stream")])).toMatch(
      /formato admitido/i,
    );
    expect(getClientFileError([metadata("datos.csv", 10, "application/pdf")])).toMatch(
      /no coincide con su extensión/i,
    );
  });

  it("enforces file count, individual size and total size limits", () => {
    const tooManyFiles = Array.from({ length: MAX_FILES + 1 }, (_, index) =>
      metadata(`file-${index}.csv`, 10),
    );
    const oversizedFile = metadata("large.csv", MAX_FILE_BYTES + 1);
    const oversizedTotal = Array.from({ length: 3 }, (_, index) =>
      metadata(`part-${index}.csv`, 9 * 1024 * 1024),
    );

    expect(getClientFileError(tooManyFiles)).toMatch(/hasta 5 archivos/i);
    expect(getClientFileError([oversizedFile])).toMatch(/10 MB/i);
    expect(oversizedTotal.reduce((total, file) => total + file.size, 0)).toBeGreaterThan(
      MAX_TOTAL_FILE_BYTES,
    );
    expect(getClientFileError(oversizedTotal)).toMatch(/25 MB/i);
  });
});
