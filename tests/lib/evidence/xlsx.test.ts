// @vitest-environment node

import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EvidenceError } from "../../../src/lib/evidence/errors";
import { parseUpload } from "../../../src/lib/evidence/parse-upload";

const fixturesDirectory = join(process.cwd(), "tests/fixtures/synthetic");

async function workbookFile(workbook: ExcelJS.Workbook, name = "datos.xlsx") {
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("XLSX parser", () => {
  it("extracts sheet names, headers, rows, values and cell locators", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transferencias");
    sheet.addRow(["Canal", "Casos"]);
    sheet.addRow(["App", 12]);
    sheet.getCell("B3").value = { formula: "SUM(B2:B2)" };

    const result = await parseUpload(await workbookFile(workbook));

    expect(result.sources).toHaveLength(3);
    expect(result.sources[0]).toMatchObject({
      locator: "Hoja Transferencias, encabezados, fila 1",
      headers: ["Canal", "Casos"],
    });
    expect(result.sources[1]).toMatchObject({
      locator: "Hoja Transferencias, fila 2",
      values: { Canal: "App", Casos: 12 },
    });
    expect(result.sources[2].values?.Casos).toMatch(/fórmula sin valor calculado/i);
  });

  it("identifies empty workbooks and malformed XLSX files", async () => {
    const emptyWorkbook = new ExcelJS.Workbook();
    emptyWorkbook.addWorksheet("Vacía");
    const malformed = new File(["not a zip"], "broken.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await expect(parseUpload(await workbookFile(emptyWorkbook))).rejects.toMatchObject<EvidenceError>({
      code: "EMPTY_FILE",
    });
    await expect(parseUpload(malformed)).rejects.toMatchObject<EvidenceError>({
      code: "INVALID_FILE",
    });
  });

  it("reads the exact synthetic workbook with prefixed XML and absolute package relationships", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(fixturesDirectory, fileName));
    const file = new File([bytes], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseUpload(file);
    const transferHeaders = result.sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, encabezados, fila 1",
    );
    const transferRows = result.sources.filter((source) =>
      /^Hoja Datos_transferencias, fila \d+$/.test(source.locator),
    );
    const readmeSource = result.sources.find((source) =>
      source.locator.startsWith("Hoja LEEME"),
    );

    expect(transferHeaders?.headers).toEqual([
      "periodo",
      "canal",
      "franja_horaria",
      "tipo_transferencia",
      "transferencias_totales",
      "menor_1_min",
      "1_a_5_min",
      "5_a_15_min",
      "mayor_15_min",
      "mayor_60_min",
      "reclamos_reportados",
      "fallidas_o_reversadas",
    ]);
    expect(transferRows).toHaveLength(12);
    expect(readmeSource).toBeDefined();
  });
});
