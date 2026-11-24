import { parse } from "csv-parse/sync";
import { EvidenceError } from "../errors";
import { addSource, createParseResult, normalizeHeaders } from "../normalize";
import type { ParsedEvidenceSource, ValidatedUpload } from "../types";

interface CsvRecord {
  record: string[];
  info: { lines: number };
}

function isCsvRecord(value: unknown): value is CsvRecord {
  if (typeof value !== "object" || value === null || !("record" in value) || !("info" in value)) {
    return false;
  }
  const record = value.record;
  const info = value.info;
  return (
    Array.isArray(record) &&
    record.every((cell) => typeof cell === "string") &&
    typeof info === "object" &&
    info !== null &&
    "lines" in info &&
    typeof info.lines === "number"
  );
}

function detectDelimiter(text: string) {
  const counts = new Map([[",", 0], [";", 0], ["\t", 0]]);
  let quoted = false;
  let lineCount = 0;

  for (let index = 0; index < text.length && lineCount < 20; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && counts.has(character)) {
      counts.set(character, (counts.get(character) ?? 0) + 1);
    } else if (character === "\n") {
      lineCount += 1;
    }
  }

  return [...counts].reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}

export function parseCsv(upload: ValidatedUpload) {
  let records: CsvRecord[];
  try {
    const parsed: unknown = parse(upload.buffer, {
      bom: true,
      delimiter: detectDelimiter(upload.buffer.toString("utf8")),
      info: true,
      max_record_size: 80_000,
      relax_column_count: false,
      skip_empty_lines: true,
      trim: true,
    });
    if (!Array.isArray(parsed) || !parsed.every(isCsvRecord)) {
      throw new EvidenceError("INVALID_FILE");
    }
    records = parsed;
  } catch {
    throw new EvidenceError("INVALID_FILE");
  }

  if (!records.length || records[0].record.every((cell) => cell.length === 0)) {
    throw new EvidenceError("EMPTY_FILE");
  }

  const headers = normalizeHeaders(records[0].record);
  const result = createParseResult();
  const headerRow = records[0].info.lines;
  const headerSource: ParsedEvidenceSource = {
    fileName: upload.fileName,
    sourceType: "csv",
    locator: `Fila de encabezados, fila ${headerRow}`,
    headers,
    excerpt: `Encabezados: ${headers.join(" | ")}`,
  };
  addSource(result, headerSource);

  let lastLine = headerRow;
  let dataRecordCount = 0;
  for (const { record, info } of records.slice(1)) {
    const firstLine = lastLine + 1;
    lastLine = info.lines;
    if (!record.some((cell) => cell.length > 0)) continue;

    dataRecordCount += 1;
    const values = Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]));
    addSource(result, {
      fileName: upload.fileName,
      sourceType: "csv",
      locator: firstLine === info.lines ? `Fila ${info.lines}` : `Filas ${firstLine}-${info.lines}`,
      headers,
      values,
      excerpt: headers.map((header) => `${header}: ${values[header]}`).join(" | "),
    });
  }

  if (!dataRecordCount) {
    result.warnings.push({
      fileName: upload.fileName,
      locator: `Fila ${headerRow}`,
      code: "NO_DATA_ROWS",
      message: "El archivo contiene encabezados, pero no filas con datos.",
    });
  }
  return result;
}
