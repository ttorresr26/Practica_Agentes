import { EvidenceError } from "@/lib/evidence/errors";
import { MAX_EXTRACTED_CHARACTERS } from "@/lib/evidence/limits";
import { readMultipartEvidenceRequest } from "@/lib/evidence/multipart";
import { parseUpload } from "@/lib/evidence/parse-upload";
import { calculateTransferMetrics } from "@/lib/evidence/calculations";
import { MAX_EVIDENCE_SOURCES } from "@/lib/evidence/limits";
import { assertSourcesArePermitted } from "@/lib/evidence/sensitive-content";
import { assertSyntheticOrPublicContent } from "@/lib/evidence/sensitive-content";
import { runAnalysis, InvalidAnalysisResponseError } from "@/lib/analysis/orchestrator";
import {
  InvalidModelResponseError,
  UnsupportedAnalysisProviderError,
  ProviderConnectionError,
  ProviderNotConfiguredError,
  MockAnalysisProvider,
} from "@/lib/analysis/provider";
import { ZodError } from "zod";
import { clarificationAnswersSchema } from "@/lib/analysis/schemas";
import type { EvidenceSource } from "@/lib/evidence/types";
import type { EvidenceWarning } from "@/lib/evidence/types";
import type { ClarificationAnswer } from "@/lib/analysis/types";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function errorResponse(error: EvidenceError) {
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status, headers: noStoreHeaders },
  );
}

export async function POST(request: Request) {
  let multipart: Awaited<ReturnType<typeof readMultipartEvidenceRequest>>;
  try {
    multipart = await readMultipartEvidenceRequest(request);
  } catch (error) {
    if (error instanceof EvidenceError) return errorResponse(error);
    return errorResponse(new EvidenceError("INVALID_REQUEST"));
  }

  if (multipart.dataPolicyAccepted !== "true") {
    return errorResponse(new EvidenceError("DATA_POLICY_REQUIRED"));
  }

  if (multipart.demand.trim().length === 0) {
    return errorResponse(new EvidenceError("INVALID_REQUEST"));
  }
  const demand = multipart.demand.trim();
  if (demand.length > MAX_EXTRACTED_CHARACTERS) {
    return errorResponse(new EvidenceError("EXTRACTED_CONTENT_TOO_LARGE"));
  }
  let clarifications: ClarificationAnswer[] = [];
  if (multipart.clarifications) {
    try {
      const parsed: unknown = JSON.parse(multipart.clarifications);
      const validated = clarificationAnswersSchema.safeParse(parsed);
      if (!validated.success) {
        throw new EvidenceError("INVALID_REQUEST");
      }
      clarifications = validated.data;
    } catch (error) {
      if (error instanceof EvidenceError) return errorResponse(error);
      return errorResponse(new EvidenceError("INVALID_REQUEST"));
    }
  }
  try {
    assertSyntheticOrPublicContent(demand);
    const sources: EvidenceSource[] = [
      {
        id: "S001",
        fileName: "Demanda",
        sourceType: "demand",
        locator: `Demanda, caracteres 1-${demand.length}`,
        excerpt: demand,
      },
    ];
    const warnings: EvidenceWarning[] = [];
    let extractedCharacters = demand.length;
    let nextSourceSequence = 2;
    const transferSources: EvidenceSource[] = [];
    let quantitativeAnalysis: ReturnType<typeof calculateTransferMetrics> | undefined;
    for (const file of multipart.files) {
      assertSyntheticOrPublicContent(file.name);
      const parsed = await parseUpload(file);
      if (sources.length + parsed.sources.length > MAX_EVIDENCE_SOURCES) {
        throw new EvidenceError("TOO_MANY_SOURCES");
      }
      const nextSources = parsed.sources.map((source, index) => ({
        ...source,
        id: `S${String(nextSourceSequence + index).padStart(3, "0")}`,
      }));
      nextSourceSequence += parsed.sources.length;
      warnings.push(...parsed.warnings);
      extractedCharacters += parsed.extractedCharacters;
      if (extractedCharacters > MAX_EXTRACTED_CHARACTERS) {
        throw new EvidenceError("EXTRACTED_CONTENT_TOO_LARGE");
      }
      assertSourcesArePermitted(nextSources);
      transferSources.push(...nextSources.filter((source) =>
        source.sourceType === "xlsx" &&
        source.locator.startsWith("Hoja Datos_transferencias,"),
      ));
      if (transferSources.length > 0) {
        quantitativeAnalysis = calculateTransferMetrics(transferSources);
      }
      sources.push(...nextSources.filter((source) =>
        !/^Hoja LEEME(?:,|$)/i.test(source.locator),
      ));
    }
    if (sources.length + clarifications.length > MAX_EVIDENCE_SOURCES) {
      throw new EvidenceError("TOO_MANY_SOURCES");
    }
    for (const clarification of clarifications) {
      assertSyntheticOrPublicContent(`${clarification.question}\n${clarification.answer}`);
      const source: EvidenceSource = {
        id: `S${String(nextSourceSequence).padStart(3, "0")}`,
        fileName: "Respuesta del PO",
        sourceType: "clarification",
        locator: `Respuesta a ${clarification.questionId}: ${clarification.question}`,
        excerpt: clarification.answer,
      };
      nextSourceSequence += 1;
      extractedCharacters += clarification.question.length + clarification.answer.length;
      if (extractedCharacters > MAX_EXTRACTED_CHARACTERS) {
        throw new EvidenceError("EXTRACTED_CONTENT_TOO_LARGE");
      }
      assertSourcesArePermitted([source]);
      sources.push(source);
    }
    const result = await runAnalysis(
      { demand, sources, clarifications, quantitativeAnalysis },
      quantitativeAnalysis || clarifications.length > 0
        ? new MockAnalysisProvider()
        : undefined,
    );
    return Response.json(
      {
        ...result,
        warnings,
        fileCount: multipart.files.length,
        extractedCharacters,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof EvidenceError) return errorResponse(error);
    if (error instanceof UnsupportedAnalysisProviderError) {
      return Response.json(
        {
          error: {
            code: "UNSUPPORTED_PROVIDER",
            message: error.message,
          },
        },
        { status: 400, headers: noStoreHeaders },
      );
    }
    if (error instanceof ProviderNotConfiguredError) {
      return Response.json(
        {
          error: {
            code: "PROVIDER_NOT_CONFIGURED",
            message: "Configura OPENAI_API_KEY y OPENAI_MODEL en el servidor para habilitar el análisis.",
          },
        },
        { status: 503, headers: noStoreHeaders },
      );
    }
    if (error instanceof ProviderConnectionError) {
      return Response.json(
        {
          error: {
            code: "PROVIDER_CONNECTION_ERROR",
            message: error.message,
          },
        },
        { status: 502, headers: noStoreHeaders },
      );
    }
    if (error instanceof InvalidAnalysisResponseError) {
      return Response.json(
        {
          error: {
            code: "INVALID_MODEL_RESPONSE",
            message: error.message,
          },
        },
        { status: 502, headers: noStoreHeaders },
      );
    }
    if (error instanceof InvalidModelResponseError || error instanceof ZodError) {
      return Response.json(
        {
          error: {
            code: "INVALID_MODEL_RESPONSE",
            message: "El proveedor devolvió una respuesta inválida. No se mostró ningún resultado sin validar.",
          },
        },
        { status: 502, headers: noStoreHeaders },
      );
    }
    return Response.json(
      {
        error: {
          code: "PROCESSING_ERROR",
          message: "No se pudo procesar la solicitud. No se guardaron los datos.",
        },
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
