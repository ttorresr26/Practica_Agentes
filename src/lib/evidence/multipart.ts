import { Buffer, File } from "node:buffer";
import { Readable } from "node:stream";
import Busboy from "busboy";
import type { IncomingHttpHeaders } from "node:http";
import { EvidenceError } from "./errors";
import {
  MAX_EXTRACTED_CHARACTERS,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_FILE_BYTES,
} from "./limits";

const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_TOTAL_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES;

export interface MultipartEvidenceRequest {
  demand: string;
  dataPolicyAccepted: string;
  clarifications: string;
  files: File[];
}

export function readMultipartEvidenceRequest(request: Request) {
  if (!request.body) return Promise.reject(new EvidenceError("INVALID_REQUEST"));

  const headers: IncomingHttpHeaders = {};
  request.headers.forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });

  let parser: ReturnType<typeof Busboy>;
  try {
    parser = Busboy({
      headers,
      limits: {
        fieldNameSize: 64,
        fieldSize: MAX_EXTRACTED_CHARACTERS * 4,
        fields: 3,
        files: MAX_FILES,
        fileSize: MAX_FILE_BYTES,
        parts: MAX_FILES + 3,
        headerPairs: 20,
      },
    });
  } catch {
    return Promise.reject(new EvidenceError("INVALID_REQUEST"));
  }

  // Node's Request body is async-iterable even though the DOM stream type omits it.
  const input = Readable.from(request.body as unknown as AsyncIterable<Uint8Array>);

  return new Promise<MultipartEvidenceRequest>((resolve, reject) => {
    const fields = new Map<string, string>();
    const files: File[] = [];
    let requestBytes = 0;
    let fileBytes = 0;
    let settled = false;

    const fail = (error: EvidenceError) => {
      if (settled) return;
      settled = true;
      input.unpipe(parser);
      input.pause();
      parser.destroy();
      reject(error);
    };

    input.on("data", (chunk: Uint8Array) => {
      requestBytes += chunk.byteLength;
      if (requestBytes > MAX_REQUEST_BYTES) {
        fail(new EvidenceError("TOTAL_SIZE_EXCEEDED"));
      }
    });
    input.on("error", () => fail(new EvidenceError("INVALID_REQUEST")));
    parser.on("error", () => fail(new EvidenceError("INVALID_REQUEST")));

    parser.on("field", (name, value, info) => {
      if (info.nameTruncated || fields.has(name)) {
        fail(new EvidenceError("INVALID_REQUEST"));
        return;
      }
      if (name !== "demand" && name !== "dataPolicyAccepted" && name !== "clarifications") {
        fail(new EvidenceError("INVALID_REQUEST"));
        return;
      }
      if (info.valueTruncated) {
        fail(
          new EvidenceError(
            name === "demand" ? "EXTRACTED_CONTENT_TOO_LARGE" : "INVALID_REQUEST",
          ),
        );
        return;
      }
      fields.set(name, value);
    });

    parser.on("file", (fieldName, stream, info) => {
      if (fieldName !== "files") {
        stream.resume();
        fail(new EvidenceError("INVALID_REQUEST"));
        return;
      }

      const chunks: Buffer[] = [];
      let currentFileBytes = 0;
      stream.on("limit", () => fail(new EvidenceError("FILE_TOO_LARGE")));
      stream.on("data", (chunk: Buffer) => {
        currentFileBytes += chunk.length;
        fileBytes += chunk.length;
        if (currentFileBytes > MAX_FILE_BYTES) {
          fail(new EvidenceError("FILE_TOO_LARGE"));
          return;
        }
        if (fileBytes > MAX_TOTAL_FILE_BYTES) {
          fail(new EvidenceError("TOTAL_SIZE_EXCEEDED"));
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      stream.on("error", () => fail(new EvidenceError("INVALID_REQUEST")));
      stream.on("end", () => {
        if (settled) return;
        if (stream.truncated) {
          fail(new EvidenceError("FILE_TOO_LARGE"));
          return;
        }
        const content = Buffer.concat(chunks, currentFileBytes);
        files.push(new File([content], info.filename ?? "", { type: info.mimeType }));
      });
    });

    parser.on("filesLimit", () => fail(new EvidenceError("TOO_MANY_FILES")));
    parser.on("fieldsLimit", () => fail(new EvidenceError("INVALID_REQUEST")));
    parser.on("partsLimit", () => fail(new EvidenceError("INVALID_REQUEST")));
    parser.on("close", () => {
      if (settled) return;
      settled = true;
      resolve({
        demand: fields.get("demand") ?? "",
        dataPolicyAccepted: fields.get("dataPolicyAccepted") ?? "",
        clarifications: fields.get("clarifications") ?? "",
        files,
      });
    });

    input.pipe(parser);
  });
}
