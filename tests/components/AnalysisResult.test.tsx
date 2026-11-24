import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnalysisResult from "../../src/components/AnalysisResult";
import { analysisResponseSchema } from "../../src/lib/analysis/schemas";
import type { AnalysisResponse } from "../../src/lib/analysis/types";

const segment = {
  key: "2026-11|App móvil|Tarde",
  label: "Noviembre 2026 · App móvil · Tarde",
  totalTransfers: 100,
  delayedTransfers: 15,
  delayPercentage: 15,
  over60Count: 0,
  over60Percentage: 0,
  complaintCount: 2,
  complaintPercentage: 2,
  complaintsPer1000: 20,
  failureCount: 1,
  failurePercentage: 1,
  sourceIds: ["S002"],
};

const result: AnalysisResponse = {
  status: "complete",
  problemFrame: {
    problem: "Validar tiempos de transferencia",
    affectedGroup: "Personas que realizan transferencias",
    ambiguities: [],
    sourceIds: ["S001"],
  },
  claims: [],
  opportunities: [],
  evidenceStatus: "partial",
  missingInformation: [],
  recommendation: {
    action: "validate",
    rationale: "Validar el segmento con mayor demora.",
    sourceIds: ["S002"],
    pendingIssues: [],
  },
  limitations: [],
  quantitativeDemandComparison: {
    status: "not_comparable",
    explanation: "La demanda no contiene una afirmación porcentual comparable.",
    sourceIds: [],
  },
  sources: [
    {
      id: "S001",
      fileName: "Demanda",
      sourceType: "demand",
      locator: "Demanda",
      excerpt: "Demanda sintética",
    },
    {
      id: "S002",
      fileName: "transferencias.xlsx",
      sourceType: "xlsx",
      locator: "Hoja Datos_transferencias, fila 2",
      excerpt: "transferencias_totales: 100",
    },
  ],
  clarifyingQuestions: [],
  changesSinceClarification: [],
  warnings: [],
  fileCount: 1,
  extractedCharacters: 100,
  analysisMode: "mock",
  quantitativeAnalysis: {
    status: "valid",
    delayDefinition: "5 minutos o más",
    recordsReceived: 1,
    recordsUsed: 1,
    recordsRejected: 0,
    totals: {
      transfers: 100,
      timeDistribution: [
        {
          key: "under_1",
          label: "Menos de 1 minuto",
          count: 85,
          percentage: 85,
          sourceIds: ["S002"],
        },
        { key: "1_to_5", label: "De 1 a 5 minutos", count: 0, percentage: 0, sourceIds: ["S002"] },
        { key: "5_to_15", label: "De 5 a 15 minutos", count: 15, percentage: 15, sourceIds: ["S002"] },
        { key: "15_to_60", label: "De 15 a 60 minutos", count: 0, percentage: 0, sourceIds: ["S002"] },
        { key: "over_60", label: "Más de 60 minutos", count: 0, percentage: 0, sourceIds: ["S002"] },
      ],
      delays: { count: 15, percentage: 15, sourceIds: ["S002"] },
      over60: { count: 0, percentage: 0, sourceIds: ["S002"] },
      complaints: { count: 2, percentage: 2, sourceIds: ["S002"] },
      complaintsPer1000: 20,
      failures: { count: 1, percentage: 1, sourceIds: ["S002"] },
      unreconciledTimeTransfers: 0,
    },
    segments: {
      byChannel: [segment],
      byDaypart: [segment],
      byPeriod: [segment],
      byCombined: [segment],
    },
    periodTrend: {
      status: "insufficient",
      direction: "insufficient",
      percentagePointChange: null,
      fromPeriod: null,
      toPeriod: null,
      sourceIds: ["S002"],
    },
    associations: [
      {
        key: "delay_complaints",
        label: "Demoras y tasa de reclamos",
        sampleSegmentCount: 1,
        coefficient: null,
        sourceIds: ["S002"],
        interpretation: "Asociación descriptiva; no demuestra causalidad.",
      },
      {
        key: "delay_failures",
        label: "Demoras y tasa de fallidas o reversadas",
        sampleSegmentCount: 1,
        coefficient: null,
        sourceIds: ["S002"],
        interpretation: "Asociación descriptiva; no demuestra causalidad.",
      },
    ],
    findings: [],
    warnings: [],
  },
};

describe("AnalysisResult", () => {
  it("integrates the quantitative report and clearly labels the remaining qualitative mock analysis", () => {
    render(<AnalysisResult result={analysisResponseSchema.parse(result)} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Cálculos cuantitativos locales · análisis cualitativo simulado",
    );
    expect(screen.getByRole("region", { name: /análisis cuantitativo/i })).toBeInTheDocument();
    expect(screen.getAllByText("Noviembre 2026 · App móvil · Tarde").length).toBeGreaterThan(0);
    expect(screen.getByText("No comparable con la demanda")).toBeInTheDocument();
  });

  it("labels qualitative analysis from the OpenAI provider accurately", () => {
    const openAiResult = analysisResponseSchema.parse({
      ...result,
      quantitativeAnalysis: undefined,
      analysisMode: "openai",
    });
    render(<AnalysisResult result={openAiResult} />);

    expect(screen.getByRole("status")).toHaveTextContent("Análisis cualitativo con OpenAI");
  });

  it("allows the PO to type and edit an answer without crashing", () => {
    const clarificationResult = analysisResponseSchema.parse({
      ...result,
      clarifyingQuestions: [{
        id: "Q1",
        question: "¿Qué resultado permitiría validar la demora?",
        reason: "Delimitar la evidencia necesaria.",
      }],
    });
    const submitClarifications = vi.fn();
    render(
      <AnalysisResult result={clarificationResult} onClarificationsSubmit={submitClarifications} />,
    );
    const answer = screen.getByRole("textbox", { name: /respuesta del po/i });
    const submitButton = screen.getByRole("button", { name: /incorporar respuestas y recalcular/i });

    expect(submitButton).toBeDisabled();

    fireEvent.change(answer, { target: { value: "Respuesta sintética del PO" } });
    expect(answer).toHaveValue("Respuesta sintética del PO");
    expect(submitButton).toBeEnabled();

    fireEvent.paste(answer, {
      clipboardData: { getData: () => "Respuesta pegada" },
    });
    fireEvent.change(answer, { target: { value: "Respuesta pegada" } });
    expect(answer).toHaveValue("Respuesta pegada");

    fireEvent.change(answer, { target: { value: "Respuesta editada y pegada" } });
    expect(answer).toHaveValue("Respuesta editada y pegada");
    fireEvent.click(submitButton);
    expect(submitClarifications).toHaveBeenCalledWith([{
      questionId: "Q1",
      question: "¿Qué resultado permitiría validar la demora?",
      answer: "Respuesta editada y pegada",
    }]);
  });
});
