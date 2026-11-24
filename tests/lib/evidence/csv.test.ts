// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { parseUpload } from "../../../src/lib/evidence/parse-upload";

const fixturesDirectory = join(process.cwd(), "tests/fixtures/synthetic");

async function fixture(name: string) {
  return new File(
    [await readFile(join(fixturesDirectory, name))],
    name,
    { type: "text/csv" },
  );
}

describe("CSV parser", () => {
  it("extracts headers and records with row references", async () => {
    const result = await parseUpload(await fixture("transferencias.csv"));

    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toMatchObject({
      sourceType: "csv",
      locator: "Fila de encabezados, fila 1",
      headers: ["Canal", "Mes", "Casos"],
    });
    expect(result.sources[1]).toMatchObject({
      locator: "Fila 2",
      values: { Canal: "App", Mes: "2026-01", Casos: "12" },
    });
  });

  it("detects semicolon-delimited CSV", async () => {
    const result = await parseUpload(await fixture("transferencias-separador.csv"));

    expect(result.sources[1].values).toEqual({ Canal: "Web", Casos: "8" });
    expect(result.sources[1].locator).toBe("Fila 2");
  });

  it("rejects empty and malformed CSV files", async () => {
    const empty = new File([], "empty.csv", { type: "text/csv" });
    const malformed = new File(['"Canal,Casos\n"App,12'], "broken.csv", { type: "text/csv" });

    await expect(parseUpload(empty)).rejects.toMatchObject<EvidenceError>({
      code: "EMPTY_FILE",
    });
    await expect(parseUpload(malformed)).rejects.toMatchObject<EvidenceError>({
      code: "INVALID_FILE",
    });
  });
});
