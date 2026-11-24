import type { UploadFormat } from "./types";

export const ALLOWED_EXTENSIONS = [".xlsx", ".csv", ".pdf", ".docx"] as const;
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_EXTRACTED_CHARACTERS = 80_000;
export const MAX_EVIDENCE_SOURCES = 5_000;

export const SUPPORTED_MIME_TYPES: Record<UploadFormat, readonly string[]> = {
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream",
  ],
  csv: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"],
  pdf: ["application/pdf", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ],
};

export const FORMAT_BY_EXTENSION: Record<(typeof ALLOWED_EXTENSIONS)[number], UploadFormat> = {
  ".xlsx": "xlsx",
  ".csv": "csv",
  ".pdf": "pdf",
  ".docx": "docx",
};
