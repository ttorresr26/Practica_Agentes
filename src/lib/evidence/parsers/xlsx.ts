import ExcelJS from "exceljs";
import { EvidenceError } from "../errors";
import { addSource, createParseResult, normalizeHeaders } from "../normalize";
import { normalizeXlsxPackage } from "../normalize-xlsx-package";
import type { EvidenceValue, ParsedEvidenceSource, ValidatedUpload } from "../types";

function normalizeCellValue(value: ExcelJS.CellValue): EvidenceValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if ("formula" in value || "sharedFormula" in value) {
    const result = "result" in value ? value.result : undefined;
    return result === undefined ? "[Fórmula sin valor calculado]" : normalizeCellValue(result);
  }
  if ("richText" in value) return value.richText.map((item) => item.text).join("");
  if ("text" in value) return value.text;
  return "[Contenido no disponible]";
}

function hasValue(value: EvidenceValue) {
  return value !== null && String(value).trim().length > 0;
}

function cellValueAt(row: ExcelJS.Row, column: number) {
  return normalizeCellValue(row.getCell(column).value);
}

export async function parseXlsx(upload: ValidatedUpload) {
  const workbook = new ExcelJS.Workbook();
  try {
    const normalizedPackage = await normalizeXlsxPackage(upload.buffer);
    await workbook.xlsx.load(new Uint8Array(normalizedPackage).buffer);
  } catch {
    throw new EvidenceError("INVALID_FILE");
  }

  const result = createParseResult();
  for (const sheet of workbook.worksheets) {
    let headerRow: ExcelJS.Row | undefined;
    sheet.eachRow((row) => {
      if (!headerRow && row.hasValues) headerRow = row;
    });

    if (!headerRow) {
      result.warnings.push({
        fileName: upload.fileName,
        locator: `Hoja ${sheet.name}`,
        code: "EMPTY_SHEET",
        message: "La hoja está vacía y no contiene información extraíble.",
      });
      continue;
    }

    const headers = normalizeHeaders(
      Array.from({ length: sheet.columnCount }, (_, index) =>
        String(cellValueAt(headerRow as ExcelJS.Row, index + 1) ?? ""),
      ),
    );
    const headerNumber = headerRow.number;
    const headerSource: ParsedEvidenceSource = {
      fileName: upload.fileName,
      sourceType: "xlsx",
      locator: `Hoja ${sheet.name}, encabezados, fila ${headerNumber}`,
      headers,
      excerpt: `Encabezados: ${headers.join(" | ")}`,
    };
    addSource(result, headerSource);

    let dataRows = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerNumber) return;
      const values = Object.fromEntries(
        headers.map((header, index) => [header, cellValueAt(row, index + 1)]),
      );
      if (!Object.values(values).some(hasValue)) return;
      dataRows += 1;

      const excerpt = headers
        .map((header) => `${header}: ${values[header] === null ? "" : String(values[header])}`)
        .join(" | ");
      addSource(result, {
        fileName: upload.fileName,
        sourceType: "xlsx",
        locator: `Hoja ${sheet.name}, fila ${rowNumber}`,
        headers,
        values,
        excerpt,
      });
    });

    if (!dataRows) {
      result.warnings.push({
        fileName: upload.fileName,
        locator: `Hoja ${sheet.name}, fila ${headerNumber}`,
        code: "NO_DATA_ROWS",
        message: "La hoja contiene encabezados, pero no filas con datos.",
      });
    }
  }

  if (!workbook.worksheets.length || result.sources.length === 0) {
    throw new EvidenceError("EMPTY_FILE");
  }
  return result;
}
