import { Buffer } from "node:buffer";
import { EvidenceError } from "./errors";
import {
  ALLOWED_EXTENSIONS,
  FORMAT_BY_EXTENSION,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_FILE_BYTES,
  SUPPORTED_MIME_TYPES,
} from "./limits";
import type { UploadFile, UploadFormat, ValidatedUpload } from "./types";
import { inspectOfficeArchive } from "./office-archive";

function getUploadFormat(file: Pick<UploadFile, "name">): UploadFormat {
  const fileName = file.name.trim().toLowerCase();
  const extension = ALLOWED_EXTENSIONS.find((item) => fileName.endsWith(item));
  if (!extension) throw new EvidenceError("UNSUPPORTED_FORMAT");
  return FORMAT_BY_EXTENSION[extension];
}

function getSafeFileName(fileName: string) {
  const normalized = fileName.replace(/\\/g, "/").split("/").pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return normalized?.slice(0, 128) || "archivo";
}

export function validateFileSet(files: Pick<UploadFile, "name" | "size" | "type">[]) {
  if (files.length > MAX_FILES) throw new EvidenceError("TOO_MANY_FILES");

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TOTAL_FILE_BYTES) throw new EvidenceError("TOTAL_SIZE_EXCEEDED");

  for (const file of files) {
    const format = getUploadFormat(file);
    const mimeType = file.type.split(";")[0].trim().toLowerCase();

    if (file.size === 0) throw new EvidenceError("EMPTY_FILE");
    if (file.size > MAX_FILE_BYTES) throw new EvidenceError("FILE_TOO_LARGE");
    if (mimeType && !SUPPORTED_MIME_TYPES[format].includes(mimeType)) {
      throw new EvidenceError("UNSUPPORTED_MIME");
    }
  }
}

export async function validateUpload(file: UploadFile): Promise<ValidatedUpload> {
  validateFileSet([file]);
  const format = getUploadFormat(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = getSafeFileName(file.name);

  if (format === "pdf" && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new EvidenceError("INVALID_FILE");
  }

  if (format === "csv") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (text.includes("\u0000")) throw new EvidenceError("INVALID_FILE");
    } catch (error) {
      if (error instanceof EvidenceError) throw error;
      throw new EvidenceError("INVALID_FILE");
    }
  }

  if (format === "xlsx" || format === "docx") {
    await inspectOfficeArchive(buffer, format);
  }

  return { buffer, fileName, format };
}
