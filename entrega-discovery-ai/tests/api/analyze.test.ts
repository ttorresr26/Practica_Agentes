// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { POST } from "../../src/app/api/analyze/route";
import { analysisResponseSchema } from "../../src/lib/analysis/schemas";
import { MAX_EXTRACTED_CHARACTERS } from "../../src/lib/evidence/limits";
import { createPdf } from "../lib/evidence/pdf-fixture";

const syntheticFixtures = join(process.cwd(), "tests/fixtures/synthetic");

function requestWith(fields: {
  demand?: string;
  policy?: string;
  files?: File[];
  clarifications?: string;
}) {
  const form = new FormData();
  form.set("demand", fields.demand ?? "Revisar demoras en el canal digital");
  form.set("dataPolicyAccepted", fields.policy ?? "true");
  if (fields.clarifications !== undefined) form.set("clarifications", fields.clarifications);
  for (const file of fields.files ?? []) form.append("files", file);
  return new Request("http://localhost/api/analyze", { method: "POST", body: form });
}

async function xlsxFile() {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Transferencias").addRows([
    ["Canal", "Casos"],
    ["App", 12],
  ]);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new File([buffer], "resumen.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function transferWorkbookFile(row: Array<string | number | null>) {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Datos_transferencias").addRows([
    [
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
    ],
    row,
  ]);
  const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  return new File([bytes], "transferencias_validacion.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("POST /api/analyze", () => {
  afterEach(() => {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  it("requires data-policy acknowledgement", async () => {
    const response = await POST(requestWith({ policy: "false" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("DATA_POLICY_REQUIRED");
  });

  it("runs the mock provider by default without API credentials", async () => {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    const response = await POST(
      requestWith({ demand: "Los clientes reportan demoras en transferencias sintéticas" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("complete");
    expect(body.providerMode).toBeUndefined();
    expect(body.analysisMode).toBe("mock");
    expect(body.problemFrame.problem).toBeTruthy();
    expect(body.clarifyingQuestion.question).toBeTruthy();
  });

  it("rejects detectable sensitive content", async () => {
    const response = await POST(
      requestWith({ demand: "Contactar a persona@example.com para confirmar el caso" }),
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("SENSITIVE_CONTENT_DETECTED");
  });

  it("processes a synthetic CSV and includes its traceable source in the mock analysis", async () => {
    const csv = new File(["Canal,Casos\nApp,12"], "resumen.csv", { type: "text/csv" });
    process.env.AI_PROVIDER = "mock";
    const response = await POST(requestWith({ files: [csv] }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources.map((source: { id: string }) => source.id)).toEqual([
      "S001",
      "S002",
      "S003",
    ]);
    expect(body.sources[2]).toMatchObject({
      fileName: "resumen.csv",
      sourceType: "csv",
      locator: "Fila 2",
      values: { Canal: "App", Casos: "12" },
    });
    expect(body.fileCount).toBe(1);
    expect(body.analysisMode).toBe("mock");
    expect(body.claims.some((claim: { sourceIds: string[] }) => claim.sourceIds.includes("S002"))).toBe(true);
  });

  it("completes the mock analysis for a demand without attachments", async () => {
    const response = await POST(requestWith({}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("complete");
    expect(body.fileCount).toBe(0);
    expect(body.sources).toHaveLength(1);
    expect(body.analysisMode).toBe("mock");
  });

  it("adds validated PO answers as traceable evidence and keeps clarification analysis local", async () => {
    const answer = "La respuesta sintética indica que se necesita confirmar el avance de la operación.";
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-key-not-used";
    process.env.OPENAI_MODEL = "test-model-not-used";

    const response = await POST(requestWith({
      clarifications: JSON.stringify([{
        questionId: "Q1",
        question: "¿Qué necesita confirmar el PO?",
        answer,
      }]),
    }));
    const body = await response.json();
    expect(response.status, JSON.stringify(body.error)).toBe(200);
    const validated = analysisResponseSchema.parse(body);
    const answerSource = validated.sources.find(
      (source) => source.sourceType === "clarification",
    );

    expect(validated.analysisMode).toBe("mock");
    expect(answerSource).toMatchObject({
      id: "S002",
      fileName: "Respuesta del PO",
      locator: "Respuesta a Q1: ¿Qué necesita confirmar el PO?",
      excerpt: answer,
    });
    expect(validated.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "requester_statement",
        text: `Respuesta del PO: ${answer}`,
        sourceIds: ["S002"],
      }),
      expect.objectContaining({
        type: "hypothesis",
        sourceIds: ["S002"],
      }),
    ]));
    expect(validated.opportunities[0].sourceIds).toContain("S002");
    expect(validated.opportunities[0].supportingEvidence.join(" ")).toContain(answer);
    expect(validated.recommendation.sourceIds).toContain("S002");
    expect(validated.recommendation.rationale).toContain("evidencia declarada");
    expect(validated.clarifyingQuestions).toHaveLength(0);
    expect(validated.changesSinceClarification.join(" ")).toContain("fuente S002");
  });

  it("rejects malformed or potentially sensitive PO answers", async () => {
    const malformed = await POST(requestWith({ clarifications: "[{}]" }));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("INVALID_REQUEST");

    const sensitive = await POST(requestWith({
      clarifications: JSON.stringify([{
        questionId: "Q1",
        question: "¿Qué se debe validar?",
        answer: "Contactar a persona@example.com para validar.",
      }]),
    }));
    expect(sensitive.status).toBe(422);
    expect((await sensitive.json()).error.code).toBe("SENSITIVE_CONTENT_DETECTED");
  });

  it("extracts XLSX data and includes its source in the three-stage mock analysis", async () => {
    const response = await POST(requestWith({ files: [await xlsxFile()] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("complete");
    expect(body.sources).toContainEqual(
      expect.objectContaining({
        fileName: "resumen.xlsx",
        sourceType: "xlsx",
        locator: "Hoja Transferencias, fila 2",
        values: { Canal: "App", Casos: 12 },
      }),
    );
    expect(body.claims.some((claim: { sourceIds: string[] }) => claim.sourceIds.includes("S002"))).toBe(true);
    expect(
      body.opportunities.some((opportunity: { sourceIds: string[] }) =>
        opportunity.sourceIds.includes("S002"),
      ),
    ).toBe(true);
    expect(body.analysisMode).toBe("mock");
  });

  it("processes the exact workbook with nested ranges and excludes LEEME from evidence", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(syntheticFixtures, fileName));
    const workbook = new File([bytes], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const response = await POST(requestWith({ files: [workbook] }));
    const body = await response.json();
    expect(response.status, JSON.stringify(body.error)).toBe(200);
    const validatedResponse = analysisResponseSchema.parse(body);
    const transferRecords = body.sources.filter(
      (source: { fileName: string; locator: string }) =>
        source.fileName === fileName &&
        /^Hoja Datos_transferencias, fila \d+$/.test(source.locator),
    );
    const transferRecordIds = new Set(transferRecords.map((source: { id: string }) => source.id));

    expect(body.fileCount).toBe(1);
    expect(body.sources.some((source: { locator: string }) =>
      source.locator.startsWith("Hoja Datos_transferencias"),
    )).toBe(true);
    expect(body.sources.some((source: { locator: string }) => source.locator.startsWith("Hoja LEEME"))).toBe(false);
    expect(transferRecords).toHaveLength(12);
    expect(body.sources).toContainEqual(
      expect.objectContaining({
        fileName,
        locator: "Hoja Datos_transferencias, encabezados, fila 1",
        headers: [
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
        ],
      }),
    );
    expect(body.quantitativeAnalysis).toMatchObject({
      status: "partial",
      recordsReceived: 12,
      recordsUsed: 12,
      recordsRejected: 0,
      totals: {
        transfers: 97200,
        delays: { count: 9361 },
        over60: { count: 1089 },
        complaints: { count: 477 },
        failures: { count: 257 },
        complaintsPer1000: expect.closeTo((477 / 97200) * 1000, 8),
        unreconciledTimeTransfers: 1089,
      },
    });
    expect(body.quantitativeAnalysis.totals.timeDistribution.map(
      (bucket: { count: number }) => bucket.count,
    )).toEqual([69460, 17290, 6726, 1546, 1089]);
    expect(body.quantitativeAnalysis.totals.delays.percentage).toBeCloseTo((9361 / 97200) * 100, 8);
    expect(body.quantitativeAnalysis.totals.over60.percentage).toBeCloseTo((1089 / 97200) * 100, 8);
    expect(body.quantitativeAnalysis.totals.complaintsPer1000).toBeCloseTo((477 / 97200) * 1000, 8);
    expect(body.quantitativeAnalysis.totals.failures.percentage).toBeCloseTo((257 / 97200) * 100, 8);
    expect(body.quantitativeAnalysis.warnings).toHaveLength(12);
    expect(body.quantitativeAnalysis.warnings).toContainEqual(
      expect.objectContaining({
        code: "UNRECONCILED_TIME_BUCKETS",
        locator: "Hoja Datos_transferencias, fila 2",
      }),
    );
    expect(body.quantitativeAnalysis.periodTrend).toMatchObject({
      status: "available",
      direction: "improving",
    });
    expect(body.quantitativeAnalysis.associations).toHaveLength(2);
    expect(body.quantitativeAnalysis.findings.every((finding: { sourceIds: string[] }) =>
      finding.sourceIds.length > 0 && finding.sourceIds.every((sourceId) => transferRecordIds.has(sourceId)),
    )).toBe(true);
    const appSegment = body.quantitativeAnalysis.segments.byChannel.find(
      (segment: { label: string }) => segment.label === "App móvil",
    );
    expect(appSegment.delayPercentage).toBeCloseTo(
      (appSegment.delayedTransfers / appSegment.totalTransfers) * 100,
      8,
    );
    expect(appSegment.complaintsPer1000).toBeCloseTo(
      (appSegment.complaintCount / appSegment.totalTransfers) * 1000,
      8,
    );
    expect(body.recommendation.action).toBe("investigate");
    expect(body.quantitativeDemandComparison.status).toBe("not_comparable");
    expect(body.recommendation.rationale).toMatch(/App móvil.*Tarde/);
    expect(validatedResponse.quantitativeAnalysis?.totals?.transfers).toBe(97200);
    expect(
      validatedResponse.sources.some((source) => source.locator.startsWith("Hoja LEEME")),
    ).toBe(false);
    expect(body.claims.some((claim: { type: string; sourceIds: string[] }) =>
      claim.type === "calculated_data" &&
      transferRecords.some((source: { id: string }) => claim.sourceIds.includes(source.id)),
    )).toBe(true);
    expect(
      body.claims.some((claim: { sourceIds: string[] }) =>
        transferRecords.some((source: { id: string }) => claim.sourceIds.includes(source.id)),
      ),
    ).toBe(true);
    expect(
      body.opportunities.some((opportunity: { sourceIds: string[] }) =>
        transferRecords.some((source: { id: string }) => opportunity.sourceIds.includes(source.id)),
      ),
    ).toBe(true);
  });

  it("keeps workbook figures and partial-data advice through a PO clarification round-trip", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(syntheticFixtures, fileName));
    const workbook = new File([bytes], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const answer = "La definición indica que mayor_60_min es un subconjunto de mayor_15_min.";

    const response = await POST(requestWith({
      files: [workbook],
      clarifications: JSON.stringify([{
        questionId: "Q-QUANT-RANGE",
        question: "¿Puede confirmarse la definición de los rangos?",
        answer,
      }]),
    }));
    const body = await response.json();
    expect(response.status, JSON.stringify(body.error)).toBe(200);
    const validated = analysisResponseSchema.parse(body);

    expect(validated.quantitativeAnalysis?.totals).toMatchObject({
      transfers: 97200,
      delays: { count: 9361 },
      over60: { count: 1089 },
      unreconciledTimeTransfers: 1089,
    });
    expect(validated.quantitativeAnalysis?.warnings).toHaveLength(12);
    expect(validated.recommendation.action).toBe("investigate");
    expect(validated.recommendation.rationale).toContain("diferencia no conciliada de 1.089");
    expect(validated.recommendation.rationale).toContain("evidencia declarada");
    expect(validated.sources.some((source) => source.sourceType === "clarification" && source.excerpt === answer)).toBe(true);
    expect(validated.claims.some((claim) =>
      claim.type === "calculated_data" && claim.text.includes("9.361"),
    )).toBe(true);
    expect(validated.changesSinceClarification.join(" ")).toContain("fuente S");
    expect(validated.clarifyingQuestions).toHaveLength(0);
    expect(validated.sources.some((source) => source.locator.startsWith("Hoja LEEME"))).toBe(false);
  });

  it("keeps the quantitative workbook flow local even when a paid provider is configured", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(syntheticFixtures, fileName));
    const workbook = new File([bytes], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-key-not-used";
    process.env.OPENAI_MODEL = "test-model-not-used";

    const response = await POST(requestWith({ files: [workbook] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysisMode).toBe("mock");
    expect(body.quantitativeAnalysis.status).toBe("partial");
  });

  it.each([
    [
      "inconsistent time buckets",
      ["2026-10", "App móvil", "Mañana", "Entre cuentas propias", 100, 70, 20, 5, 4, 0, 2, 1],
      "UNRECONCILED_TIME_BUCKETS",
      "partial",
    ],
    [
      "missing required values",
      ["2026-10", "App móvil", "Mañana", "Entre cuentas propias", 100, 70, 20, 5, 4, 1, null, 1],
      "INVALID_ROW",
      "invalid",
    ],
  ])("reports %s without recommending from invalid rows", async (_case, row, warningCode, expectedStatus) => {
    const response = await POST(
      requestWith({ files: [await transferWorkbookFile(row as Array<string | number | null>)] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.quantitativeAnalysis.status).toBe(expectedStatus);
    if (expectedStatus === "invalid") {
      expect(body.quantitativeAnalysis.totals).toBeUndefined();
    } else {
      expect(body.quantitativeAnalysis.totals).toMatchObject({
        transfers: 100,
        unreconciledTimeTransfers: 1,
      });
    }
    expect(body.quantitativeAnalysis.warnings).toContainEqual(
      expect.objectContaining({ code: warningCode }),
    );
    expect(body.recommendation.action).toBe("investigate");
  });

  it("extracts selectable PDF text and analyzes its traceable source", async () => {
    const pdf = new File([createPdf("Demora sintetica")], "resumen.pdf", {
      type: "application/pdf",
    });
    const response = await POST(requestWith({ files: [pdf] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sources).toContainEqual(
      expect.objectContaining({
        fileName: "resumen.pdf",
        sourceType: "pdf",
        locator: "Página 1",
        excerpt: "Demora sintetica",
      }),
    );
    expect(body.analysisMode).toBe("mock");
  });

  it("extracts DOCX text as a source to the mock analysis", async () => {
    const bytes = await readFile(join(syntheticFixtures, "resumen.docx"));
    const docx = new File([bytes], "resumen.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const response = await POST(requestWith({ files: [docx] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sources.some((source: { fileName: string; sourceType: string; excerpt: string }) =>
      source.fileName === "resumen.docx" &&
      source.sourceType === "docx" &&
      source.excerpt.includes("Síntesis de prueba"),
    )).toBe(true);
    expect(body.analysisMode).toBe("mock");
  });

  it("processes multiple supported files and keeps their source references", async () => {
    const csv = new File(["Canal,Casos\nApp,12"], "resumen.csv", { type: "text/csv" });
    const pdf = new File([createPdf("Demora sintetica")], "resumen.pdf", {
      type: "application/pdf",
    });
    const response = await POST(requestWith({ files: [csv, pdf] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.fileCount).toBe(2);
    expect(body.sources.some((source: { fileName: string }) => source.fileName === "resumen.csv")).toBe(true);
    expect(body.sources.some((source: { fileName: string }) => source.fileName === "resumen.pdf")).toBe(true);
    expect(body.analysisMode).toBe("mock");
  });

  it("returns a specific processing error for an invalid XLSX file", async () => {
    const invalidXlsx = new File(["not an Office archive"], "invalido.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const response = await POST(requestWith({ files: [invalidXlsx] }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("INVALID_FILE");
    expect(body.error.message).toMatch(/no se pudo leer|dañado/i);
  });

  it("rejects a file with an unsupported extension with a specific error", async () => {
    const invalid = new File(["not supported"], "documento.exe", {
      type: "application/octet-stream",
    });
    const response = await POST(requestWith({ files: [invalid] }));
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error.code).toBe("UNSUPPORTED_FORMAT");
    expect(body.error.message).toMatch(/xlsx.*csv.*pdf.*docx/i);
  });

  it("rejects an empty demand with a clear request error", async () => {
    const response = await POST(requestWith({ demand: "   " }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.message).toMatch(/demanda y los archivos/i);
  });

  it("returns an explicit provider-configuration error", async () => {
    process.env.AI_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    const response = await POST(requestWith({}));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });

  it("enforces demand length limits", async () => {
    const response = await POST(
      requestWith({ demand: "x".repeat(MAX_EXTRACTED_CHARACTERS + 1) }),
    );
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("EXTRACTED_CONTENT_TOO_LARGE");
  });
});
