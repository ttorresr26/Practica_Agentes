import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { EvidenceError } from "../errors";
import { MAX_EXTRACTED_CHARACTERS } from "../limits";
import { addSource, createParseResult, normalizeText } from "../normalize";
import type { ValidatedUpload } from "../types";

const MAX_PDF_PAGES = 200;
const MAX_PDF_TEXT_ITEMS = MAX_EXTRACTED_CHARACTERS;

export async function parsePdf(upload: ValidatedUpload) {
  const result = createParseResult();
  let rawTextCharacters = 0;
  let textItemCount = 0;
  const task = pdfjs.getDocument({
    data: new Uint8Array(upload.buffer),
    useSystemFonts: false,
    verbosity: 0,
  });

  try {
    const document = await task.promise;
    if (document.numPages > MAX_PDF_PAGES) throw new EvidenceError("INVALID_FILE");

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      let text: string;
      try {
        const reader = page.streamTextContent().getReader();
        const textItems: string[] = [];
        let textCharacters = 0;
        let streamComplete = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              streamComplete = true;
              break;
            }

            for (const item of value.items) {
              if (!("str" in item)) continue;
              textItemCount += 1;
              const nextLength =
                textCharacters + (textItems.length ? 1 : 0) + item.str.length;
              if (
                textItemCount > MAX_PDF_TEXT_ITEMS ||
                rawTextCharacters + nextLength > MAX_EXTRACTED_CHARACTERS
              ) {
                throw new EvidenceError("EXTRACTED_CONTENT_TOO_LARGE");
              }
              textItems.push(item.str);
              textCharacters = nextLength;
            }
          }
        } finally {
          if (!streamComplete) {
            try {
              await reader.cancel();
            } finally {
              reader.releaseLock();
            }
          } else {
            reader.releaseLock();
          }
        }

        text = normalizeText(textItems.join(" "));
        rawTextCharacters += textCharacters;
      } finally {
        await page.cleanup();
      }

      if (!text) {
        result.warnings.push({
          fileName: upload.fileName,
          locator: `Página ${pageNumber}`,
          code: "EMPTY_PAGE",
          message: "No se encontró texto seleccionable en esta página.",
        });
        continue;
      }

      addSource(result, {
        fileName: upload.fileName,
        sourceType: "pdf",
        locator: `Página ${pageNumber}`,
        excerpt: text,
      });
    }
  } catch (error) {
    if (error instanceof EvidenceError) throw error;
    throw new EvidenceError("INVALID_FILE");
  } finally {
    await task.destroy();
  }

  if (!result.sources.length) throw new EvidenceError("UNREADABLE_FILE");
  return result;
}
