// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MockAnalysisProvider, type AnalysisProvider } from "../../../src/lib/analysis/provider";
import { runAnalysis } from "../../../src/lib/analysis/orchestrator";
import { calculateTransferMetrics } from "../../../src/lib/evidence/calculations";
import { parseUpload } from "../../../src/lib/evidence/parse-upload";

const fixturesDirectory = join(process.cwd(), "tests/fixtures/synthetic");

const fakeProvider: AnalysisProvider = {
  mode: "mock",
  async completeJson({ stage }) {
    if (stage === "structure") {
      return {
        problem: "Las transferencias presentan demoras",
        affectedGroup: "Clientes que usan transferencias",
        ambiguities: ["No se conoce la duración ni la frecuencia"],
        sourceIds: ["S001"],
      };
    }
    if (stage === "evidence") {
      return {
        evidenceStatus: "insufficient",
        claims: [
          {
            type: "inference",
            text: "La demanda permite plantear una demora como hipótesis inicial",
            sourceIds: ["S001"],
          },
        ],
        missingInformation: ["Métricas de tiempo y frecuencia"],
        limitations: ["La demanda describe una percepción, no evidencia cuantitativa"],
      };
    }
    return {
      opportunities: [
        {
          id: "OP-1",
          title: "Investigar los puntos de espera",
          rationale: "Se necesita separar causas antes de proponer una solución",
          customerOutcome: "Comprender y reducir la demora",
          segment: "Clientes que usan transferencias",
          supportingEvidence: ["La demanda registra una percepción de demora"],
          uncertainties: ["Frecuencia y causa no confirmadas"],
          risks: ["Construir sin evidencia podría no resolver el problema"],
          impactPotential: "medium",
          evidenceLevel: "insufficient",
          researchEffort: "medium",
          alternatives: [
            {
              id: "ALT-1",
              title: "Observar el recorrido",
              description: "Recolectar evidencia verificable del recorrido",
              evaluation: {
                customerValue: "medium",
                expectedImpact: "high",
                technicalFeasibility: "medium",
                complexity: "medium",
                risks: ["Instrumentación necesaria"],
                availableEvidence: "insufficient",
                sourceIds: ["S001"],
              },
              sourceIds: ["S001"],
            },
          ],
          sourceIds: ["S001"],
        },
      ],
      recommendation: {
        action: "investigate",
        rationale: "La evidencia no permite definir una solución probada",
        sourceIds: ["S001"],
        pendingIssues: ["Confirmar alcance y frecuencia"],
        alternativeId: "ALT-1",
      },
    };
  },
};

describe("runAnalysis", () => {
  it("executes the three stages and validates source references", async () => {
    const result = await runAnalysis(
      {
        demand: "Los clientes reportan demoras al realizar transferencias",
        sources: [
          {
            id: "S001",
            fileName: "Demanda",
            sourceType: "demand",
            locator: "Demanda, caracteres 1-55",
            excerpt: "Los clientes reportan demoras al realizar transferencias",
          },
        ],
      },
      fakeProvider,
    );

    expect(result.status).toBe("complete");
    expect(result.problemFrame.affectedGroup).toBe("Clientes que usan transferencias");
    expect(result.evidenceStatus).toBe("insufficient");
    expect(result.recommendation.action).toBe("investigate");
    expect(result.quantitativeDemandComparison).toMatchObject({
      status: "not_comparable",
      sourceIds: [],
    });
  });

  it("uses one selected provider for all three stages and reports its mode", async () => {
    const stages: string[] = [];
    const provider = {
      mode: "openai" as const,
      async completeJson(input: Parameters<AnalysisProvider["completeJson"]>[0]) {
        stages.push(input.stage);
        return fakeProvider.completeJson(input);
      },
    };

    const result = await runAnalysis(
      {
        demand: "Los clientes reportan demoras al realizar transferencias",
        sources: [{
          id: "S001",
          fileName: "Demanda",
          sourceType: "demand",
          locator: "Demanda",
          excerpt: "Demanda sintética",
        }],
      },
      provider,
    );

    expect(stages).toEqual(["structure", "evidence", "advice"]);
    expect(result.analysisMode).toBe("openai");
  });

  it("passes PO answers to evidence and advice stages and cites them in the updated output", async () => {
    const answer = "La respuesta sintética aclara que debe confirmarse el avance de la operación.";
    const clarifications = [{
      questionId: "Q1",
      question: "¿Qué debe confirmar el PO?",
      answer,
    }];
    const sources = [
      {
        id: "S001",
        fileName: "Demanda",
        sourceType: "demand" as const,
        locator: "Demanda",
        excerpt: "Demanda sintética sobre transferencias",
      },
      {
        id: "S002",
        fileName: "Respuesta del PO",
        sourceType: "clarification" as const,
        locator: "Respuesta a Q1",
        excerpt: answer,
      },
    ];
    const prompts: Partial<Record<"evidence" | "advice", string>> = {};
    const provider: AnalysisProvider = {
      mode: "mock",
      async completeJson(input) {
        if (input.stage === "evidence" || input.stage === "advice") {
          prompts[input.stage] = input.userPrompt;
        }
        return fakeProvider.completeJson(input);
      },
    };

    const result = await runAnalysis({
      demand: "Demanda sintética sobre transferencias",
      sources,
      clarifications,
    }, provider);

    expect(prompts.evidence).toContain(answer);
    expect(prompts.advice).toContain(answer);
    expect(result.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "requester_statement", sourceIds: ["S002"] }),
      expect.objectContaining({ type: "hypothesis", sourceIds: ["S002"] }),
    ]));
    expect(result.opportunities[0].sourceIds).toContain("S002");
    expect(result.recommendation.sourceIds).toContain("S002");
    expect(result.changesSinceClarification.join(" ")).toContain("fuente S002");
    expect(result.clarifyingQuestions).toHaveLength(0);
  });

  it("rejects invented source references", async () => {
    const provider: AnalysisProvider = {
      mode: "mock",
      async completeJson({ stage }) {
        if (stage === "structure") {
          return {
            problem: "Problema",
            affectedGroup: "Grupo",
            ambiguities: [],
            sourceIds: ["S999"],
          };
        }
        throw new Error("unexpected stage");
      },
    };

    await expect(
      runAnalysis(
        {
          demand: "Demanda sintética",
          sources: [
            {
              id: "S001",
              fileName: "Demanda",
              sourceType: "demand",
              locator: "Demanda",
              excerpt: "Demanda sintética",
            },
          ],
        },
        provider,
      ),
    ).rejects.toThrow(/respuesta inválida|referencia/i);
  });

  it("passes the exact XLSX rows to analyzeEvidence and returns analysis references to them", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(fixturesDirectory, fileName));
    const parsed = await parseUpload(
      new File([bytes], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const demand = "Revisar tiempos de transferencias con datos sintéticos";
    const sources = [
      {
        id: "S001",
        fileName: "Demanda",
        sourceType: "demand" as const,
        locator: `Demanda, caracteres 1-${demand.length}`,
        excerpt: demand,
      },
      ...parsed.sources.map((source, index) => ({
        ...source,
        id: `S${String(index + 2).padStart(3, "0")}`,
      })),
    ];
    let evidencePrompt = "";
    const mock = new MockAnalysisProvider();
    const provider: AnalysisProvider = {
      mode: "mock",
      async completeJson(input) {
        if (input.stage === "evidence") evidencePrompt = input.userPrompt;
        return mock.completeJson(input);
      },
    };

    const result = await runAnalysis({ demand, sources }, provider);
    const transferRow = sources.find(
      (source) =>
        source.fileName === fileName &&
        source.locator === "Hoja Datos_transferencias, fila 2",
    );

    expect(evidencePrompt).toContain("transferencias_totales");
    expect(evidencePrompt).toContain(JSON.stringify(transferRow?.values));
    expect(result.sources.filter((source) => source.fileName === fileName)).toHaveLength(
      parsed.sources.length,
    );
    expect(
      result.claims.some((claim) => claim.sourceIds.includes(transferRow?.id ?? "")),
    ).toBe(true);
    expect(
      result.opportunities.some((opportunity) =>
        opportunity.sourceIds.includes(transferRow?.id ?? ""),
      ),
    ).toBe(true);
  });

  it("feeds verified calculations to all three stages and bases advice on the leading segment", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(fixturesDirectory, fileName));
    const parsed = await parseUpload(
      new File([bytes], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const demand = "Analizar demoras en transferencias sintéticas";
    const parsedSources = parsed.sources.map((source, index) => ({
      ...source,
      id: `S${String(index + 2).padStart(3, "0")}`,
    }));
    const quantitativeAnalysis = calculateTransferMetrics(parsedSources);
    const sources = [
      {
        id: "S001",
        fileName: "Demanda",
        sourceType: "demand" as const,
        locator: `Demanda, caracteres 1-${demand.length}`,
        excerpt: demand,
      },
      ...parsedSources.filter((source) => !source.locator.startsWith("Hoja LEEME")),
    ];
    const prompts: Partial<Record<"structure" | "evidence" | "advice", string>> = {};
    const mock = new MockAnalysisProvider();
    const provider: AnalysisProvider = {
      mode: "mock",
      async completeJson(input) {
        prompts[input.stage] = input.userPrompt;
        return mock.completeJson(input);
      },
    };

    const result = await runAnalysis(
      { demand, sources, quantitativeAnalysis },
      provider,
    );
    const dataFinding = quantitativeAnalysis.findings.find(
      (finding) => finding.id === "QF-2",
    );

    expect(prompts.structure).toContain(dataFinding?.observation);
    expect(prompts.evidence).toContain(dataFinding?.observation);
    expect(prompts.advice).toContain(dataFinding?.observation);
    expect(result.quantitativeAnalysis).toEqual(quantitativeAnalysis);
    expect(result.quantitativeDemandComparison).toMatchObject({
      status: "not_comparable",
      sourceIds: [],
    });
    expect(result.recommendation.action).toBe("investigate");
    expect(result.recommendation.rationale).toContain("App móvil · Tarde");
    expect(result.problemFrame.ambiguities.join(" ")).toMatch(/agregados.*causalidad/i);
    expect(
      result.claims.some((claim) => /no se aportaron datos verificables/i.test(claim.text)),
    ).toBe(false);
    expect(result.missingInformation).toContain(
      "Datos sintéticos o públicos representativos para validar el patrón en el contexto de clientes.",
    );
    expect(result.limitations).toContain(
      "Los cálculos describen registros agregados y sintéticos; no prueban causalidad ni experiencia individual.",
    );
    expect(result.recommendation.sourceIds.some((id) =>
      sources.some((source) => source.id === id && source.locator.startsWith("Hoja Datos_transferencias, fila")),
    )).toBe(true);
    expect(result.recommendation.action).toBe("investigate");
    expect(result.recommendation.rationale).toContain("1.089");
    expect(result.recommendation.rationale).toMatch(/confirma|concilia/i);
    expect(result.clarifyingQuestions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        question: expect.stringMatching(/mayor_60_min|rangos/i),
      }),
    ]));
    expect(result.opportunities[0].alternatives.some((alternative) =>
      alternative.sourceIds.some((id) =>
        sources.some((source) => source.id === id && source.locator.startsWith("Hoja Datos_transferencias, fila")),
      ),
    )).toBe(true);
  });

  it("contradicts an explicit numeric demand only against its directly comparable metric", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(fixturesDirectory, fileName));
    const parsed = await parseUpload(
      new File([bytes], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const demand = "Más de 20% de las transferencias tarda más de 60 minutos.";
    const parsedSources = parsed.sources.map((source, index) => ({
      ...source,
      id: `S${String(index + 2).padStart(3, "0")}`,
    }));
    const quantitativeAnalysis = calculateTransferMetrics(parsedSources);
    const sources = [
      {
        id: "S001",
        fileName: "Demanda",
        sourceType: "demand" as const,
        locator: `Demanda, caracteres 1-${demand.length}`,
        excerpt: demand,
      },
      ...parsedSources.filter((source) => !source.locator.startsWith("Hoja LEEME")),
    ];

    const result = await runAnalysis(
      { demand, sources, quantitativeAnalysis },
      new MockAnalysisProvider(),
    );

    expect(result.quantitativeDemandComparison).toMatchObject({
      status: "contradicted",
      sourceIds: expect.arrayContaining(
        quantitativeAnalysis.totals!.over60.sourceIds,
      ),
    });
    expect(result.quantitativeDemandComparison.explanation).toContain("1,12%");
    expect(result.claims).toContainEqual(expect.objectContaining({
      type: "calculated_data",
      text: expect.stringMatching(/contradice/i),
      sourceIds: expect.arrayContaining(quantitativeAnalysis.totals!.over60.sourceIds),
    }));
    expect(result.recommendation.rationale).toMatch(/contradice/i);

    const lessThanDemand = "Menos del 20% de las transferencias tarda más de 60 minutos.";
    const lessThanResult = await runAnalysis(
      { demand: lessThanDemand, sources, quantitativeAnalysis },
      new MockAnalysisProvider(),
    );
    expect(lessThanResult.quantitativeDemandComparison.status).toBe("not_contradicted");
  });
});
