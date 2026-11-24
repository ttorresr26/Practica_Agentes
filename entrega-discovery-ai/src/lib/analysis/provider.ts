import OpenAI from "openai";
import type { AnalysisMode, AnalysisStage } from "./types";

export class ProviderNotConfiguredError extends Error {
  constructor() {
    super("OPENAI_API_KEY y OPENAI_MODEL deben configurarse en el servidor.");
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderConnectionError extends Error {
  constructor() {
    super("No se pudo conectar con el proveedor de IA. Intenta nuevamente.");
    this.name = "ProviderConnectionError";
  }
}

export class InvalidModelResponseError extends Error {
  constructor() {
    super("El proveedor devolvió una respuesta JSON inválida.");
    this.name = "InvalidModelResponseError";
  }
}

export interface AnalysisProvider {
  readonly mode: AnalysisMode;
  completeJson(input: {
    stage: AnalysisStage;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<unknown>;
}

export class MockAnalysisProvider implements AnalysisProvider {
  readonly mode = "mock" as const;

  async completeJson({
    stage,
    userPrompt,
  }: {
    stage: AnalysisStage;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<unknown> {
    const text = `${userPrompt}\n${stage}`.toLowerCase();
    const sourceIds = [
      ...new Set(
        [...text.matchAll(/\bs\d{3}\b/g)].map((match) => match[0].toUpperCase()),
      ),
    ];
    const primarySourceIds = sourceIds.length > 0 ? sourceIds : ["S001"];
    const scenario = text.includes("contradict") || text.includes("insuficiente")
      ? "contradictory"
      : text.includes("tarjeta") || text.includes("rechaz")
        ? "cards"
        : text.includes("transfer")
          ? "transfers"
          : text.includes("digital") || text.includes("aplicación") || text.includes("app")
            ? "digital"
            : text.includes("atención") || text.includes("reclamo")
              ? "service"
              : "insufficient";
    const hasClarification = /respuestas aclaratorias:\s*\[\s*\{/i.test(userPrompt);

    if (stage === "structure") {
      const frames = {
        transfers: {
          problem: "Posible demora o dificultad percibida al realizar transferencias",
          affectedGroup: "Clientes que utilizan el canal de transferencias",
        },
        cards: {
          problem: "Posible rechazo o interrupción durante operaciones con tarjetas",
          affectedGroup: "Clientes que realizan compras o pagos con tarjeta",
        },
        digital: {
          problem: "Posibles fallas o fricciones en un canal digital",
          affectedGroup: "Clientes que intentan completar gestiones por el canal digital",
        },
        service: {
          problem: "Posible demora o dificultad para resolver reclamos de atención al cliente",
          affectedGroup: "Clientes que requieren seguimiento o resolución de un reclamo",
        },
        contradictory: {
          problem: "Posibles inconsistencias entre la información disponible y el problema reportado",
          affectedGroup: "Clientes o procesos afectados por la necesidad descrita",
        },
        insufficient: {
          problem: "Necesidad o inconveniente descrito sin evidencia suficiente para definir su causa",
          affectedGroup: "Clientes o usuarios vinculados a la demanda",
        },
      };
      const frame = frames[scenario];
      return {
        ...frame,
        ambiguities: [
          "No hay evidencia cuantitativa ni contexto operativo confirmado",
          "La demanda expresa una percepción y requiere delimitación",
        ],
        sourceIds: primarySourceIds,
      };
    }

    if (stage === "evidence") {
      const contradictory = scenario === "contradictory";
      return {
        evidenceStatus: contradictory ? "insufficient" : "partial",
        claims: [
          {
            type: "requester_statement",
            text: "El solicitante describe una necesidad o una dificultad en el escenario señalado.",
            sourceIds: primarySourceIds,
          },
          {
            type: "fact",
            text: primarySourceIds.length > 1
              ? "Las fuentes disponibles incluyen la demanda escrita y contenidos extraídos de archivos."
              : "La única fuente disponible es la demanda escrita proporcionada.",
            sourceIds: primarySourceIds,
          },
          {
            type: "inference",
            text: contradictory
              ? "La información parece inconsistente y no permite atribuir una causa."
              : "La demanda sugiere una fricción que podría afectar la experiencia del cliente.",
            sourceIds: primarySourceIds,
          },
          {
            type: "hypothesis",
            text: contradictory
              ? "La causa de las diferencias podría resolverse comparando las fuentes originales."
              : "La causa podría estar relacionada con el canal, el proceso o la comunicación.",
            sourceIds: primarySourceIds,
          },
          {
            type: "missing_information",
            text: "No se aportaron datos verificables que permitan medir frecuencia, alcance o resultado.",
            sourceIds: primarySourceIds,
          },
        ],
        missingInformation: [
          "Contexto operativo y momento en que ocurre el problema",
          "Información verificable sobre frecuencia y alcance",
          contradictory ? "Fuentes que expliquen las diferencias encontradas" : "Resultado esperado por el cliente",
        ],
        limitations: [
          "Resultado generado por una IA simulada con reglas deterministas.",
          "No se debe interpretar el texto como evidencia real de clientes.",
        ],
      };
    }

    const recommendations = {
      transfers: "Investigar el recorrido de transferencia y confirmar en qué etapa ocurre la demora.",
      cards: "Investigar los tipos de rechazo y confirmar si comparten una causa común.",
      digital: "Investigar el flujo digital y registrar los pasos donde aparece la falla.",
      service: "Investigar el seguimiento de reclamos y identificar puntos de espera.",
      contradictory: "No adoptar una solución hasta reconciliar las fuentes contradictorias.",
      insufficient: "Recopilar evidencia básica antes de priorizar una solución.",
    };
    const opportunityByScenario = {
      transfers: {
        title: "Reducir fricción en transferencias",
        customerOutcome: "Comprender y completar una transferencia sin demoras percibidas.",
        segment: "Clientes que realizan transferencias",
      },
      cards: {
        title: "Disminuir rechazos de tarjeta",
        customerOutcome: "Completar pagos con tarjeta de forma clara y confiable.",
        segment: "Clientes que realizan compras o pagos con tarjeta",
      },
      digital: {
        title: "Mejorar la continuidad del canal digital",
        customerOutcome: "Completar una gestión digital sin fallas ni necesidad de repetir pasos.",
        segment: "Clientes que utilizan el canal digital",
      },
      service: {
        title: "Reducir la espera en reclamos",
        customerOutcome: "Recibir seguimiento y resolución comprensible de un reclamo.",
        segment: "Clientes con reclamos o solicitudes de atención",
      },
      contradictory: {
        title: "Reconciliar la evidencia antes de decidir",
        customerOutcome: "Contar con una explicación coherente del problema reportado.",
        segment: "Clientes o procesos relacionados con la evidencia disponible",
      },
      insufficient: {
        title: "Delimitar el problema antes de construir",
        customerOutcome: "Explicar qué ocurre, para quién y qué resultado necesita mejorar.",
        segment: "Usuarios vinculados a la demanda",
      },
    };
    const opportunity = opportunityByScenario[scenario];
    const alternatives = [
      {
        id: "ALT-1",
        title: "Guía contextual y comunicación",
        description: "Dar al cliente orientación específica sobre el paso actual y los próximos pasos.",
        evaluation: {
          customerValue: "medium" as const,
          expectedImpact: "medium" as const,
          technicalFeasibility: "high" as const,
          complexity: "low" as const,
          risks: ["Puede no resolver una causa operativa subyacente"],
          availableEvidence: "partial" as const,
          sourceIds: primarySourceIds,
        },
        sourceIds: primarySourceIds,
      },
      {
        id: "ALT-2",
        title: "Observabilidad y seguimiento",
        description: "Registrar el recorrido sintético y crear una evidencia verificable del punto de fricción.",
        evaluation: {
          customerValue: "medium" as const,
          expectedImpact: "high" as const,
          technicalFeasibility: "medium" as const,
          complexity: "medium" as const,
          risks: ["Puede requerir instrumentación adicional", "No garantiza una solución al problema"],
          availableEvidence: "insufficient" as const,
          sourceIds: primarySourceIds,
        },
        sourceIds: primarySourceIds,
      },
      {
        id: "ALT-3",
        title: "Validar una intervención pequeña",
        description: "Diseñar una prueba acotada para comprobar una hipótesis antes de implementar una solución amplia.",
        evaluation: {
          customerValue: "high" as const,
          expectedImpact: "medium" as const,
          technicalFeasibility: "high" as const,
          complexity: "medium" as const,
          risks: ["Los resultados pueden no representar el volumen real", "Requiere definir éxito previamente"],
          availableEvidence: "insufficient" as const,
          sourceIds: primarySourceIds,
        },
        sourceIds: primarySourceIds,
      },
    ];
    return {
      opportunities: [
        {
          id: "OP-1",
          ...opportunity,
          rationale: "Es una oportunidad derivada directamente de la demanda y requiere validar el problema antes de construir.",
          supportingEvidence: [
            "La demanda escrita registra la necesidad o dificultad.",
            primarySourceIds.length > 1
              ? "Se incorporaron fuentes extraídas de archivos sintéticos o públicos con localizadores trazables."
              : "No se incorporaron archivos verificables en esta ejecución.",
          ],
          uncertainties: [
            "Frecuencia y alcance no están definidos",
            "Causa raíz y resultado esperado no están confirmados",
          ],
          risks: [
            "Construir una solución sin confirmar la causa podría no resolver la necesidad",
            "Una inferencia podría confundirse con un hecho",
          ],
          alternatives,
          impactPotential: scenario === "contradictory" ? "low" : "medium",
          evidenceLevel: scenario === "contradictory" ? "insufficient" : "partial",
          researchEffort: scenario === "contradictory" ? "high" : "medium",
          sourceIds: primarySourceIds,
        },
      ],
      recommendation: {
        action: "investigate",
        rationale: recommendations[scenario],
        sourceIds: primarySourceIds,
        alternativeId: "ALT-2",
        pendingIssues: [
          "Confirmar el alcance real de la demanda",
          "Definir qué información permitiría verificar la hipótesis",
        ],
      },
      ...(!hasClarification
        ? {
            clarifyingQuestion: {
              question: scenario === "contradictory"
                ? "¿Qué fuente confirma cuál versión del problema?"
                : "¿Qué resultado observable permitiría confirmar o descartar la hipótesis?",
              reason: "Una respuesta concretaría la evidencia mínima antes de recomendar una solución.",
            },
            clarifyingQuestions: [
              {
                id: "Q1",
                question: scenario === "contradictory"
                  ? "¿Qué fuente confirma cuál versión del problema?"
                  : "¿Qué resultado observable permitiría confirmar o descartar la hipótesis?",
                reason: "Una respuesta concretaría la evidencia mínima antes de recomendar una solución.",
              },
            ],
          }
        : {}),
      changesSinceClarification: hasClarification
        ? ["Se recalcularon las hipótesis y la recomendación con las respuestas proporcionadas."]
        : [],
    };
  }
}

export class UnsupportedAnalysisProviderError extends Error {
  constructor(provider: string) {
    super(`El proveedor "${provider}" no está implementado. Usa AI_PROVIDER=mock u OpenAI de forma explícita.`);
    this.name = "UnsupportedAnalysisProviderError";
  }
}

export function createAnalysisProvider(): AnalysisProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockAnalysisProvider();
  if (provider === "openai") return new OpenAIAnalysisProvider();
  throw new UnsupportedAnalysisProviderError(provider);
}

export class OpenAIAnalysisProvider implements AnalysisProvider {
  readonly mode = "openai" as const;

  async completeJson({
    stage,
    systemPrompt,
    userPrompt,
  }: {
    stage: AnalysisStage;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<unknown> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.OPENAI_MODEL?.trim();
    if (!apiKey || !model) throw new ProviderNotConfiguredError();

    try {
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${userPrompt}\n\nEtapa: ${stage}` },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new ProviderConnectionError();
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof ProviderNotConfiguredError) throw error;
      if (error instanceof InvalidModelResponseError) throw error;
      if (error instanceof SyntaxError) throw new InvalidModelResponseError();
      throw new ProviderConnectionError();
    }
  }
}
