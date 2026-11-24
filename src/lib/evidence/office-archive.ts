import { Buffer } from "node:buffer";
import * as yauzl from "yauzl";
import { EvidenceError } from "./errors";

const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_EXPANDED_ARCHIVE_BYTES = 25 * 1024 * 1024;

const packageParts: Record<"xlsx" | "docx", string> = {
  xlsx: "xl/workbook.xml",
  docx: "word/document.xml",
};

export function inspectOfficeArchive(buffer: Buffer, format: "xlsx" | "docx") {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let expandedBytes = 0;
    let actualExpandedBytes = 0;
    let entryCount = 0;
    let hasContentTypes = false;
    let hasMainDocument = false;

    const finish = (error?: EvidenceError) => {
      if (settled) return;
      settled = true;
      if (error) {
        zipFile?.close();
        reject(error);
      } else {
        resolve();
      }
    };

    let zipFile: yauzl.ZipFile | undefined;
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, decodeStrings: true, validateEntrySizes: true, strictFileNames: true },
      (error, archive) => {
        if (error || !archive) {
          finish(new EvidenceError("INVALID_FILE"));
          return;
        }

        zipFile = archive;
        if (archive.entryCount > MAX_ARCHIVE_ENTRIES) {
          finish(new EvidenceError("INVALID_FILE"));
          return;
        }

        archive.on("error", () => finish(new EvidenceError("INVALID_FILE")));
        archive.on("entry", (entry) => {
          entryCount += 1;
          expandedBytes += entry.uncompressedSize;
          const entryName = entry.fileName.replace(/\\/g, "/");
          const unsafeName =
            yauzl.validateFileName(entry.fileName) !== null ||
            entryName.split("/").includes("..") ||
            entryName.startsWith("/");
          const embeddedContent =
            /(?:^|\/)vbaProject\.bin$/i.test(entryName) ||
            /(?:^|\/)(?:embeddings|media)\//i.test(entryName) ||
            /(?:^|\/)externalLinks\//i.test(entryName);

          if (
            unsafeName ||
            embeddedContent ||
            entry.isEncrypted() ||
            entryCount > MAX_ARCHIVE_ENTRIES ||
            expandedBytes > MAX_EXPANDED_ARCHIVE_BYTES
          ) {
            finish(new EvidenceError("INVALID_FILE"));
            return;
          }

          if (entryName === "[Content_Types].xml") hasContentTypes = true;
          if (entryName === packageParts[format]) hasMainDocument = true;
          if (entryName.endsWith("/")) {
            archive.readEntry();
            return;
          }
          archive.openReadStream(entry, (streamError, stream) => {
            if (streamError) {
              finish(new EvidenceError("INVALID_FILE"));
              return;
            }

            let entryExpandedBytes = 0;
            stream.on("data", (chunk: Buffer) => {
              entryExpandedBytes += chunk.length;
              actualExpandedBytes += chunk.length;
              if (actualExpandedBytes > MAX_EXPANDED_ARCHIVE_BYTES) {
                stream.destroy();
                finish(new EvidenceError("INVALID_FILE"));
              }
            });
            stream.on("error", () => finish(new EvidenceError("INVALID_FILE")));
            stream.on("end", () => {
              if (entryExpandedBytes !== entry.uncompressedSize) {
                finish(new EvidenceError("INVALID_FILE"));
                return;
              }
              archive.readEntry();
            });
          });
        });
        archive.on("end", () => {
          if (!hasContentTypes || !hasMainDocument) {
            finish(new EvidenceError("INVALID_FILE"));
            return;
          }
          finish();
        });
        archive.readEntry();
      },
    );
  });
}
