import type { AnalysisProvider } from "./provider";
import type { EvidenceSource } from "../evidence/types";
import type { ClarificationAnswer } from "./types";
import type { DemandFrame, EvidenceAnalysis, OpportunityAdvice } from "./types";
import type { QuantitativeAnalysis } from "../evidence/calculations";

const baseRules = `Solo puedes usar la demanda proporcionada y sus referencias. No inventes métricas, hechos, clientes, tamaños ni evidencia. Diferencia claramente hechos, inferencias e hipótesis. Explica las limitaciones del análisis. Responde exclusivamente con JSON válido en español.`;

export async function structureDemand(
  demand: string,
  sourceId: string,
  provider: AnalysisProvider,
  quantitativeAnalysis?: QuantitativeAnalysis,
): Promise<DemandFrame> {
  return provider.completeJson({
    stage: "structure",
    systemPrompt: `${baseRules} Tu tarea es estructurar una demanda de descubrimiento de producto. Devuelve: problem, affectedGroup, ambiguities y sourceIds. Todos los datos de grupo y problema deben remitirse a la fuente disponible.`,
    userPrompt: `Demanda:\n${demand}\n\nIdentificador disponible: ${sourceId}\n\nCálculos descriptivos validados (si están disponibles):\n${JSON.stringify(quantitativeAnalysis ?? null)}`,
  }) as Promise<DemandFrame>;
}

export async function analyzeEvidence(
  demand: string,
  frame: DemandFrame,
  sourceId: string,
  provider: AnalysisProvider,
  sources: EvidenceSource[] = [],
  quantitativeAnalysis?: QuantitativeAnalysis,
  clarifications: ClarificationAnswer[] = [],
): Promise<EvidenceAnalysis> {
  return provider.completeJson({
    stage: "evidence",
    systemPrompt: `${baseRules} Tu tarea es clasificar la evidencia disponible sin convertir una percepción o solicitud en un hecho comprobado. Devuelve evidenceStatus, claims, missingInformation y limitations. Usa fact, inference, hypothesis, missing_information o recommendation en cada claim. Cada claim debe incluir sourceIds válidos.`,
    userPrompt: `Demanda:\n${demand}\n\nMarco estructurado:\n${JSON.stringify(frame)}\n\nFuentes normalizadas disponibles:\n${JSON.stringify(sources)}\n\nRespuestas aclaratorias del PO:\n${JSON.stringify(clarifications)}\n\nCálculos descriptivos validados (si están disponibles):\n${JSON.stringify(quantitativeAnalysis ?? null)}\n\nIdentificador principal: ${sourceId}.`,
  }) as Promise<EvidenceAnalysis>;
}

export async function adviseOpportunity(
  demand: string,
  frame: DemandFrame,
  evidence: EvidenceAnalysis,
  provider: AnalysisProvider,
  clarifications: ClarificationAnswer[] = [],
  quantitativeAnalysis?: QuantitativeAnalysis,
): Promise<OpportunityAdvice> {
  return provider.completeJson({
    stage: "advice",
    systemPrompt: `${baseRules} Tu tarea es comparar posibles oportunidades cualitativamente y elegir una acción siguiente: investigate, experiment, solution o discard. No declares éxito probado ni inventes resultados. Para cada oportunidad devuelve id, título, rationale, customerOutcome, segment, supportingEvidence, uncertainties, risks, alternatives (máximo tres) y sourceIds. Cada alternativa devuelve id, título, descripción, sourceIds y evaluation con customerValue, expectedImpact, technicalFeasibility, complexity, risks, availableEvidence y sourceIds. Incluye alternativeId en la recomendación cuando señala una alternativa. Sin puntuaciones compuestas ni métricas inventadas.`,
    userPrompt: `Demanda:\n${demand}\n\nMarco:\n${JSON.stringify(frame)}\n\nEvidencia:\n${JSON.stringify(evidence)}\n\nCálculos descriptivos validados (si están disponibles):\n${JSON.stringify(quantitativeAnalysis ?? null)}\n\nRespuestas aclaratorias:\n${JSON.stringify(clarifications)}`,
  }) as Promise<OpportunityAdvice>;
}
