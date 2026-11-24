import { validateUpload } from "./validate-upload";
import { parseCsv } from "./parsers/csv";
import { parseDocx } from "./parsers/docx";
import { parsePdf } from "./parsers/pdf";
import { parseXlsx } from "./parsers/xlsx";
import type { UploadFile } from "./types";

export async function parseUpload(file: UploadFile) {
  const upload = await validateUpload(file);

  switch (upload.format) {
    case "csv":
      return parseCsv(upload);
    case "docx":
      return parseDocx(upload);
    case "pdf":
      return parsePdf(upload);
    case "xlsx":
      return parseXlsx(upload);
  }
}
