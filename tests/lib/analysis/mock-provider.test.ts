// @vitest-environment node

import { describe, expect, it } from "vitest";
import { MockAnalysisProvider, createAnalysisProvider } from "../../../src/lib/analysis/provider";
import { runAnalysis } from "../../../src/lib/analysis/orchestrator";
import type { EvidenceSource } from "../../../src/lib/evidence/types";

const sources: EvidenceSource[] = [
  {
    id: "S001",
    fileName: "Demanda",
    sourceType: "demand",
    locator: "Demanda, caracteres 1-80",
    excerpt: "",
  },
];

const scenarios = [
  ["transferencias", "Los clientes reportan demoras en transferencias"],
  ["tarjetas", "Hay rechazos de tarjetas durante las compras"],
  ["canal digital", "Los clientes presentan fallas en el canal digital"],
  ["atención al cliente", "Los reclamos tardan demasiado en atención al cliente"],
  ["contradictoria", "Hay registros contradictorios y la evidencia disponible es insuficiente"],
];

describe("MockAnalysisProvider", () => {
  it("incorporates a clarification and does not repeat the answered question", async () => {
    const demand = "Los clientes reportan demoras en transferencias";
    const answer = "Una transferencia sintética debería completarse sin demora percibida.";
    const result = await runAnalysis(
      {
        demand,
        clarifications: [{
          questionId: "Q1",
          question: "¿Qué resultado observable permitiría confirmar o descartar la hipótesis?",
          answer,
        }],
        sources: [
          { ...sources[0], excerpt: demand },
          {
            id: "S002",
            fileName: "Respuesta del PO",
            sourceType: "clarification",
            locator: "Respuesta a Q1",
            excerpt: answer,
          },
        ],
      },
      new MockAnalysisProvider(),
    );
    expect(result.clarifyingQuestions).toHaveLength(0);
    expect(result.claims.some((claim) =>
      claim.type === "requester_statement" && claim.text.includes(answer) && claim.sourceIds.includes("S002"),
    )).toBe(true);
    expect(result.changesSinceClarification.some((item) => /recalcularon/i.test(item))).toBe(true);
  });
  it.each(scenarios)("produces a structured mock result for %s", async (_name, demand) => {
    const provider = new MockAnalysisProvider();
    const result = await runAnalysis(
      { demand, sources: [{ ...sources[0], excerpt: demand }] },
      provider,
    );

    expect(result.status).toBe("complete");
    expect(result.problemFrame.problem).toBeTruthy();
    expect(result.problemFrame.affectedGroup).toBeTruthy();
    expect(result.claims.some((claim) => claim.type === "fact")).toBe(true);
    expect(result.claims.some((claim) => claim.type === "requester_statement")).toBe(true);
    expect(result.claims.some((claim) => claim.type === "calculated_data")).toBe(false);
    expect(result.claims.some((claim) => claim.type === "inference")).toBe(true);
    expect(result.claims.some((claim) => claim.type === "hypothesis")).toBe(true);
    expect(result.claims.some((claim) => claim.type === "missing_information")).toBe(true);
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.opportunities.every((opportunity) =>
      opportunity.customerOutcome &&
      opportunity.segment &&
      opportunity.supportingEvidence &&
      opportunity.risks &&
      opportunity.uncertainties,
    )).toBe(true);
    expect(result.opportunities.every((opportunity) => opportunity.alternatives.length <= 3)).toBe(true);
    expect(result.opportunities.every((opportunity) =>
      opportunity.alternatives.every((alternative) =>
        alternative.evaluation.customerValue &&
        alternative.evaluation.expectedImpact &&
        alternative.evaluation.technicalFeasibility &&
        alternative.evaluation.complexity &&
        alternative.evaluation.risks &&
        alternative.evaluation.availableEvidence,
      ),
    )).toBe(true);
    expect(result.opportunities.every((opportunity) =>
      opportunity.impactPotential &&
      opportunity.evidenceLevel &&
      opportunity.researchEffort,
    )).toBe(true);
    expect(result.evidenceStatus).toBeTruthy();
    expect(result.recommendation.action).toBeTruthy();
    expect(result.clarifyingQuestion?.question).toBeTruthy();
    expect(result.limitations.some((item) => /simulad/i.test(item))).toBe(true);
  });

  it("does not claim a metric or invented evidence", async () => {
    const demand = "Clientes ficticios reportan demoras de un canal sintético";
    const provider = new MockAnalysisProvider();
    const result = await runAnalysis(
      { demand, sources: [{ ...sources[0], excerpt: demand }] },
      provider,
    );

    expect(JSON.stringify(result)).not.toMatch(/\b\d+(?:[.,]\d+)?\s*(?:%|horas|días)\b/i);
  });

  it("defaults to mock mode and keeps OpenAI opt-in", () => {
    delete process.env.AI_PROVIDER;
    expect(createAnalysisProvider()).toBeInstanceOf(MockAnalysisProvider);
    process.env.AI_PROVIDER = "openai";
    expect(createAnalysisProvider().constructor.name).toBe("OpenAIAnalysisProvider");
  });
});
