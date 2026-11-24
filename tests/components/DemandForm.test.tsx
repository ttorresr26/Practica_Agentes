import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DemandForm from "../../src/components/DemandForm";

function analysisResponse({
  problem = "Problema original",
  recommendation = "Recomendación original",
  clarifyingQuestions = [],
  claims = [],
  sources = [{
    id: "S001",
    fileName: "Demanda",
    sourceType: "demand",
    locator: "Demanda",
    excerpt: "Demanda sintética",
  }],
  changesSinceClarification = [],
  fileCount = 0,
  frameSourceIds = ["S001"],
  recommendationSourceIds = ["S001"],
}: {
  problem?: string;
  recommendation?: string;
  clarifyingQuestions?: Array<{ id: string; question: string; reason: string }>;
  claims?: Array<{ type: string; text: string; sourceIds: string[] }>;
  sources?: Array<{
    id: string;
    fileName: string;
    sourceType: string;
    locator: string;
    excerpt: string;
  }>;
  changesSinceClarification?: string[];
  fileCount?: number;
  frameSourceIds?: string[];
  recommendationSourceIds?: string[];
} = {}) {
  return {
    status: "complete",
    problemFrame: {
      problem,
      affectedGroup: "Personas que realizan transferencias",
      ambiguities: [],
      sourceIds: frameSourceIds,
    },
    claims,
    opportunities: [],
    evidenceStatus: "partial",
    missingInformation: [],
    recommendation: {
      action: "investigate",
      rationale: recommendation,
      sourceIds: recommendationSourceIds,
      pendingIssues: [],
    },
    limitations: [],
    sources,
    clarifyingQuestions,
    changesSinceClarification,
    warnings: [],
    quantitativeDemandComparison: {
      status: "not_comparable",
      explanation: "La demanda no contiene una afirmación porcentual comparable.",
      sourceIds: [],
    },
    fileCount,
    extractedCharacters: 20,
    analysisMode: "mock",
  };
}

describe("DemandForm", () => {
  it("requires a demand before submission", () => {
    render(<DemandForm />);

    expect(screen.getByRole("textbox", { name: /demanda/i })).toBeRequired();
  });

  it("accepts demand text", () => {
    render(<DemandForm />);
    const demand = screen.getByRole("textbox", { name: /demanda/i });

    fireEvent.change(demand, { target: { value: "Reducir demoras en transferencias" } });

    expect(demand).toHaveValue("Reducir demoras en transferencias");
  });

  it("shows the supported file formats", () => {
    render(<DemandForm />);
    expect(screen.getByText(/XLSX, CSV, PDF y DOCX/i)).toBeInTheDocument();
  });

  it("sends the demand, policy and selected attachment as multipart data", async () => {
    let submittedData: FormData | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body instanceof FormData) submittedData = init.body;
      return {
        ok: true,
        json: async () => ({
          status: "complete",
          problemFrame: {
            problem: "Demoras al realizar transferencias",
            affectedGroup: "Clientes que realizan transferencias",
            ambiguities: ["Duración y frecuencia no especificadas"],
            sourceIds: ["S001"],
          },
          claims: [
            {
              type: "hypothesis",
              text: "Las demoras podrían afectar la experiencia de uso",
              sourceIds: ["S001"],
            },
          ],
          opportunities: [
            {
              id: "OP-1",
              title: "Investigar el tiempo de transferencia",
              rationale: "Se requiere evidencia temporal",
              customerOutcome: "Comprender por qué ocurre la demora",
              segment: "Clientes que realizan transferencias",
              supportingEvidence: ["La demanda registra una percepción de demora"],
              uncertainties: ["Frecuencia no confirmada"],
              risks: ["Construir sin evidencia podría no resolver el problema"],
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
          evidenceStatus: "insufficient",
          missingInformation: ["Frecuencia y duración"],
          recommendation: {
            action: "investigate",
            rationale: "La demanda no aporta evidencia cuantitativa",
            sourceIds: ["S001"],
            pendingIssues: ["Confirmar alcance"],
          },
          limitations: ["El análisis se basa solo en la demanda escrita"],
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
              locator: "Demanda, caracteres 1-35",
              excerpt: "Reducir demoras en transferencias",
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DemandForm />);
    fireEvent.change(screen.getByRole("textbox", { name: /demanda/i }), {
      target: { value: "Reducir demoras en transferencias" },
    });
    const xlsx = new File(["synthetic workbook"], "resumen.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    fireEvent.change(screen.getByLabelText(/adjuntar archivos/i), {
      target: { files: [xlsx] },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: /analizar demanda/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(requestOptions.headers).toBeUndefined();
    expect(submittedData?.get("demand")).toBe("Reducir demoras en transferencias");
    expect(submittedData?.get("dataPolicyAccepted")).toBe("true");
    expect(submittedData?.get("files")).toMatchObject({ name: "resumen.xlsx" });
    expect(screen.getByRole("region", { name: /marco de descubrimiento/i })).toHaveTextContent(
      /Demoras al realizar transferencias/i,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/análisis simulado completado/i);
    expect(screen.getByRole("button", { name: /descargar informe html/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exportar \/ imprimir como pdf/i })).toBeInTheDocument();
  });

  it("prevents a native form submission and preserves inputs when file processing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({
          error: {
            code: "INVALID_FILE",
            message: "No se pudo leer el archivo XLSX. Verifica que no esté dañado.",
          },
        }),
      })),
    );

    render(<DemandForm />);
    const demandText = "Reducir demoras en transferencias";
    const xlsx = new File(["damaged workbook"], "resumen.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    fireEvent.change(screen.getByRole("textbox", { name: /demanda/i }), {
      target: { value: demandText },
    });
    fireEvent.change(screen.getByLabelText(/adjuntar archivos/i), {
      target: { files: [xlsx] },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    const form = screen.getByRole("button", { name: /analizar demanda/i }).closest("form");
    if (!form) throw new Error("No se encontró el formulario de demanda.");
    const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo leer el archivo XLSX. Verifica que no esté dañado.",
    );
    expect(screen.getByRole("textbox", { name: /demanda/i })).toHaveValue(demandText);
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByLabelText(/adjuntar archivos/i)).toHaveProperty("files.0.name", "resumen.xlsx");
    expect(screen.getByText("Archivo seleccionado: resumen.xlsx")).toBeInTheDocument();
  });

  it("shows a clear validation message for an empty demand without sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<DemandForm />);

    const form = screen.getByRole("button", { name: /analizar demanda/i }).closest("form");
    if (!form) throw new Error("No se encontró el formulario de demanda.");
    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toHaveTextContent("Escribe una demanda para continuar.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a processing state while the analysis request is pending", async () => {
    let resolveFetch!: (response: {
      ok: boolean;
      json: () => Promise<unknown>;
    }) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<DemandForm />);
    fireEvent.change(screen.getByRole("textbox", { name: /demanda/i }), {
      target: { value: "Reducir demoras sintéticas" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /analizar demanda/i }));

    expect(await screen.findByRole("status", { name: /progreso del análisis/i })).toBeInTheDocument();

    resolveFetch({
      ok: false,
      json: async () => ({
        error: { code: "INVALID_FILE", message: "No se pudo procesar la solicitud." },
      }),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo procesar la solicitud.");
  });

  it("submits a PO answer as multipart data and displays the updated analysis", async () => {
    const updatedAnswer = "La respuesta sintética confirma que el usuario espera una señal de avance.";
    const csvSource = {
      id: "S002",
      fileName: "datos.csv",
      sourceType: "csv",
      locator: "Fila 2",
      excerpt: "Canal: App",
    };
    const responses = [
      analysisResponse({
        sources: [
          {
            id: "S001",
            fileName: "Demanda",
            sourceType: "demand",
            locator: "Demanda",
            excerpt: "Demanda sintética",
          },
          csvSource,
        ],
        fileCount: 1,
        clarifyingQuestions: [{
          id: "Q1",
          question: "¿Qué necesita validar el PO?",
          reason: "Aclarar el resultado esperado.",
        }],
      }),
      analysisResponse({
        problem: "Problema revisado con la aclaración",
        recommendation: "Recomendación revisada con la respuesta del PO.",
        claims: [{
          type: "requester_statement",
          text: `Respuesta del PO: ${updatedAnswer}`,
          sourceIds: ["S003"],
        }],
        sources: [
          {
            id: "S001",
            fileName: "Demanda",
            sourceType: "demand",
            locator: "Demanda",
            excerpt: "Demanda sintética",
          },
          {
            ...csvSource,
          },
          {
            id: "S003",
            fileName: "Respuesta del PO",
            sourceType: "clarification",
            locator: "Respuesta a Q1",
            excerpt: updatedAnswer,
          },
        ],
        fileCount: 1,
        recommendationSourceIds: ["S003"],
        changesSinceClarification: ["La respuesta se incorporó como evidencia trazable."],
      }),
    ];
    const submittedForms: FormData[] = [];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body instanceof FormData) submittedForms.push(init.body);
      return { ok: true, json: async () => responses.shift() };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DemandForm />);
    fireEvent.change(screen.getByRole("textbox", { name: /demanda/i }), {
      target: { value: "Demanda sintética" },
    });
    fireEvent.change(screen.getByLabelText(/adjuntar archivos/i), {
      target: {
        files: [new File(["Canal,Casos\nApp,3"], "datos.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /analizar demanda/i }));
    expect(await screen.findByText("Recomendación original")).toBeInTheDocument();

    const answer = screen.getByRole("textbox", { name: /respuesta del po/i });
    fireEvent.change(answer, { target: { value: updatedAnswer } });
    fireEvent.click(screen.getByRole("button", { name: /incorporar respuestas y recalcular/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(submittedForms[1].get("demand")).toBe("Demanda sintética");
    expect(submittedForms[1].get("files")).toMatchObject({ name: "datos.csv" });
    expect(JSON.parse(String(submittedForms[1].get("clarifications")))).toEqual([{
      questionId: "Q1",
      question: "¿Qué necesita validar el PO?",
      answer: updatedAnswer,
    }]);
    expect(await screen.findByText("Problema revisado con la aclaración")).toBeInTheDocument();
    expect(screen.getByText("Recomendación revisada con la respuesta del PO.")).toBeInTheDocument();
    expect(screen.getByText("datos.csv")).toBeInTheDocument();
    expect(screen.getByText(`Respuesta del PO: ${updatedAnswer}`)).toBeInTheDocument();
    expect(screen.getByText("La respuesta se incorporó como evidencia trazable.")).toBeInTheDocument();
  });

  it("preserves the previous analysis and the typed answer when clarification processing fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => analysisResponse({
          clarifyingQuestions: [{
            id: "Q1",
            question: "¿Qué necesita validar el PO?",
            reason: "Aclarar el resultado esperado.",
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: "PROCESSING_ERROR",
            message: "No se pudo incorporar la respuesta. Los datos no se guardaron.",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<DemandForm />);
    fireEvent.change(screen.getByRole("textbox", { name: /demanda/i }), {
      target: { value: "Demanda sintética" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /analizar demanda/i }));
    expect(await screen.findByText("Recomendación original")).toBeInTheDocument();

    const answer = screen.getByRole("textbox", { name: /respuesta del po/i });
    fireEvent.change(answer, { target: { value: "Respuesta que debe conservarse" } });
    fireEvent.click(screen.getByRole("button", { name: /incorporar respuestas y recalcular/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo incorporar la respuesta. Los datos no se guardaron.",
    );
    expect(screen.getByText("Problema original")).toBeInTheDocument();
    expect(screen.getByText("Recomendación original")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /respuesta del po/i })).toHaveValue(
      "Respuesta que debe conservarse",
    );
  });
});
