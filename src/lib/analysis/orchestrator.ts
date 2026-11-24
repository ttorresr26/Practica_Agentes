import type { EvidenceSource } from "../evidence/types";
import type { AnalysisProvider } from "./provider";
import { createAnalysisProvider } from "./provider";
import { demandFrameSchema, evidenceAnalysisSchema, opportunityAdviceSchema } from "./schemas";
import { analyzeEvidence, adviseOpportunity, structureDemand } from "./stages";
import type { AnalysisInput, AnalysisResponse, EvidenceAnalysis } from "./types";
import type {
  QuantitativeAnalysis,
  QuantitativeFinding,
  QuantitativeSegment,
} from "../evidence/calculations";
import type { QuantitativeDemandComparison } from "./types";

export class InvalidAnalysisResponseError extends Error {
  constructor() {
    super("El proveedor devolvió una respuesta inválida. No se mostró ningún resultado sin validar.");
    this.name = "InvalidAnalysisResponseError";
  }
}

function assertSourceReferences(sourceIds: string[], sources: EvidenceSource[]) {
  const validIds = new Set(sources.map((source) => source.id));
  const invalidIds = sourceIds.filter((sourceId) => !validIds.has(sourceId));
  if (invalidIds.length > 0) {
    throw new InvalidAnalysisResponseError();
  }
}

function quantifiedClaim(finding: QuantitativeFinding) {
  const details = [
    finding.observation,
    `Magnitud: ${finding.magnitude}.`,
    `Segmento: ${finding.segment}.`,
    `Periodo: ${finding.period}.`,
    `Suficiencia de evidencia: ${finding.evidenceSufficiency}.`,
    ...finding.limitations.map((limitation) => `Limitación: ${limitation}`),
    ...(["inference", "hypothesis"].includes(finding.kind)
      ? [`Posible implicación para el cliente: ${finding.customerImplication}`]
      : []),
    finding.hypothesis ? `Hipótesis por investigar: ${finding.hypothesis}` : "",
  ].filter(Boolean);

  return {
    type: finding.kind,
    text: details.join(" "),
    sourceIds: finding.sourceIds,
  };
}

function findTopDelaySegment(segments: QuantitativeSegment[]) {
  return [...segments].sort((a, b) => b.delayPercentage - a.delayPercentage)[0];
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function comparisonContext(text: string, index: number, length: number) {
  const leftBoundary = Math.max(
    text.lastIndexOf(".", index - 1),
    text.lastIndexOf(";", index - 1),
    text.lastIndexOf("?", index - 1),
    text.lastIndexOf("!", index - 1),
  ) + 1;
  const rightCandidates = [".", ";", "?", "!"]
    .map((punctuation) => text.indexOf(punctuation, index + length))
    .filter((position) => position >= 0);
  const rightBoundary = rightCandidates.length > 0
    ? Math.min(...rightCandidates)
    : text.length;
  return text.slice(leftBoundary, rightBoundary).toLowerCase();
}

function compareDemandToQuantitative(
  demand: string,
  analysis?: QuantitativeAnalysis,
): QuantitativeDemandComparison {
  const statements = [...demand.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)];
  const comparable: Array<{
    threshold: number;
    actual: number;
    count: number;
    total: number;
    metricLabel: string;
    sourceIds: string[];
    relation: "greater" | "at_least" | "less" | "at_most" | "equal";
    claim: string;
  }> = [];
  const totals = analysis?.totals;

  for (const statement of statements) {
    const index = statement.index ?? 0;
    const context = comparisonContext(demand, index, statement[0].length);
    const metric = /(?:más|mayor|superior)\s+de\s+60\s*(?:minutos?|mins?)|mayor_60_min/.test(context)
      ? totals?.over60
        ? { measure: totals.over60, label: "transferencias superiores a 60 minutos" }
        : undefined
      : /\breclamos?\b/.test(context)
        ? totals?.complaints
          ? { measure: totals.complaints, label: "reclamos por transferencia" }
          : undefined
        : /\b(?:fallidas?|reversadas?)\b/.test(context)
          ? totals?.failures
            ? { measure: totals.failures, label: "transferencias fallidas o reversadas" }
            : undefined
          : /\b(?:demoras?|retrasos?|esperas?|5\s*minutos?\s*o\s*más)\b/.test(context)
            ? totals?.delays
              ? { measure: totals.delays, label: "transferencias de 5 minutos o más" }
              : undefined
            : undefined;
    if (!metric || !totals) continue;

    const beforeNumber = context.slice(0, context.indexOf(statement[0]));
    const relation = /(?:más\s+(?:de|del)|mayor\s+(?:de|del)|superior\s+(?:a|al)|excede|supera)\s*$/.test(beforeNumber)
      ? "greater"
      : /(?:al menos|por lo menos)\s*$/.test(beforeNumber)
        ? "at_least"
        : /(?:menos\s+(?:de|del)|menor\s+(?:de|del)|inferior\s+(?:a|al))\s*$/.test(beforeNumber)
          ? "less"
          : /(?:como máximo|a lo sumo|hasta)\s*$/.test(beforeNumber)
            ? "at_most"
            : "equal";
    comparable.push({
      threshold: Number(statement[1].replace(",", ".")),
      actual: metric.measure.percentage,
      count: metric.measure.count,
      total: totals.transfers,
      metricLabel: metric.label,
      sourceIds: metric.measure.sourceIds,
      relation,
      claim: statement[0],
    });
  }

  if (comparable.length === 0) {
    return {
      status: "not_comparable",
      explanation: analysis?.totals
        ? "La demanda no contiene una afirmación porcentual explícita vinculada directamente a un indicador calculado."
        : "No hay métricas cuantitativas válidas para contrastar una afirmación de la demanda.",
      sourceIds: [],
    };
  }

  const outcomes = comparable.map((item) => {
    const contradicted = item.relation === "greater"
      ? item.actual <= item.threshold
      : item.relation === "at_least"
        ? item.actual < item.threshold
        : item.relation === "less"
          ? item.actual >= item.threshold
          : item.relation === "at_most"
            ? item.actual > item.threshold
            : Math.abs(item.actual - item.threshold) > 0.01;
    const relationLabel = {
      greater: "más de",
      at_least: "al menos",
      less: "menos de",
      at_most: "como máximo",
      equal: "aproximadamente",
    }[item.relation];
    return {
      contradicted,
      explanation: `La demanda afirma ${relationLabel} ${item.claim} para ${item.metricLabel}; los datos muestran ${formatPercentage(item.actual)}% (${item.count.toLocaleString("es-EC")} de ${item.total.toLocaleString("es-EC")}).`,
      sourceIds: item.sourceIds,
    };
  });
  const partialNote = analysis?.status === "partial"
    ? " El cálculo es parcial y debe interpretarse junto con las advertencias de calidad."
    : "";
  const contradicted = outcomes.some((outcome) => outcome.contradicted);

  return {
    status: contradicted ? "contradicted" : "not_contradicted",
    explanation: `${outcomes.map((outcome) => outcome.explanation).join(" ")}${partialNote}`,
    sourceIds: [...new Set(outcomes.flatMap((outcome) => outcome.sourceIds))],
  };
}

function applyQuantitativeAdvice(
  advice: Awaited<ReturnType<typeof opportunityAdviceSchema.parse>>,
  quantitativeAnalysis: AnalysisInput["quantitativeAnalysis"],
  sources: EvidenceSource[],
) {
  if (!quantitativeAnalysis) return advice;
  const topSegment = quantitativeAnalysis.totals
    ? findTopDelaySegment(quantitativeAnalysis.segments.byCombined)
    : undefined;
  const segmentSourceIds = topSegment?.sourceIds ?? [];

  if (quantitativeAnalysis.status === "valid" && topSegment) {
    const rationale =
      `Validar si el segmento ${topSegment.label} presenta una fricción de tiempo: ` +
      `${formatPercentage(topSegment.delayPercentage)}% de sus ${topSegment.totalTransfers.toLocaleString("es-EC")} transferencias ` +
      `tardaron 5 minutos o más. El dato es agregado y no establece causalidad.`;
    const opportunities = advice.opportunities.map((opportunity, index) =>
      index === 0
        ? {
            ...opportunity,
            title: `Validar demoras en ${topSegment.label}`,
            rationale,
            segment: topSegment.label,
            supportingEvidence: [rationale, ...opportunity.supportingEvidence],
            sourceIds: [...new Set([...opportunity.sourceIds, ...segmentSourceIds])],
            alternatives: opportunity.alternatives.map((alternative) => ({
              ...alternative,
              sourceIds: [...new Set([...alternative.sourceIds, ...segmentSourceIds])],
              evaluation: {
                ...alternative.evaluation,
                sourceIds: [...new Set([...alternative.evaluation.sourceIds, ...segmentSourceIds])],
              },
            })),
          }
        : opportunity,
    );

    return {
      ...advice,
      opportunities,
      recommendation: {
        ...advice.recommendation,
        action: "validate" as const,
        rationale,
        sourceIds: topSegment.sourceIds,
        pendingIssues: [
          "Contrastar el patrón con evidencia adicional sintética o pública.",
          "Investigar la experiencia y las causas antes de proponer una solución.",
        ],
      },
    };
  }

  const totals = quantitativeAnalysis.totals;
  const timeBucketTotal = totals?.timeDistribution.reduce((sum, bucket) => sum + bucket.count, 0) ?? 0;
  const unreconciled = totals?.unreconciledTimeTransfers ?? 0;
  const hasUnreconciled = unreconciled !== 0;
  const warningSources = sources.filter((source) =>
    quantitativeAnalysis.warnings.some(
      (warning) =>
        warning.fileName === source.fileName &&
        (warning.locator === source.locator ||
          warning.locator === "Hoja Datos_transferencias"),
    ),
  );
  const dataQualitySourceIds = warningSources.length > 0
    ? warningSources.map((source) => source.id)
    : segmentSourceIds.length > 0
      ? segmentSourceIds
      : advice.recommendation.sourceIds;
  const dataQualityReason = hasUnreconciled && totals
    ? `Los rangos exclusivos suman ${timeBucketTotal.toLocaleString("es-EC")} frente a ${totals.transfers.toLocaleString("es-EC")} transferencias; queda una diferencia no conciliada de ${Math.abs(unreconciled).toLocaleString("es-EC")}. Se conserva el total y no se asigna la diferencia a un rango; confirma la definición de mayor_60_min antes de priorizar.`
    : quantitativeAnalysis.status === "partial"
      ? `Hay advertencias de calidad en ${quantitativeAnalysis.recordsRejected} de ${quantitativeAnalysis.recordsReceived} registros; revísalas antes de priorizar.`
      : "No se pudieron validar registros suficientes para interpretar porcentajes; revisa encabezados y datos antes de priorizar.";
  const segmentSummary = topSegment
    ? `El segmento ${topSegment.label} presenta ${formatPercentage(topSegment.delayPercentage)}% de transferencias de 5 minutos o más.`
    : "";
  const rationale = [segmentSummary, dataQualityReason].filter(Boolean).join(" ");
  const opportunities = advice.opportunities.map((opportunity, index) =>
    index === 0 && topSegment
      ? {
          ...opportunity,
          title: `Investigar demoras en ${topSegment.label}`,
          rationale,
          segment: topSegment.label,
          evidenceLevel: "partial" as const,
          supportingEvidence: [rationale, ...opportunity.supportingEvidence],
          uncertainties: [...new Set([
            ...opportunity.uncertainties,
            "La diferencia entre rangos y total debe conciliarse antes de priorizar una intervención.",
          ])],
          sourceIds: [...new Set([...opportunity.sourceIds, ...segmentSourceIds])],
          alternatives: opportunity.alternatives.map((alternative) => ({
            ...alternative,
            sourceIds: [...new Set([...alternative.sourceIds, ...segmentSourceIds])],
            evaluation: {
              ...alternative.evaluation,
              availableEvidence: "partial" as const,
              sourceIds: [...new Set([...alternative.evaluation.sourceIds, ...segmentSourceIds])],
            },
          })),
        }
      : opportunity,
  );
  const rangeQuestion = hasUnreconciled
    ? {
        id: "Q-QUANT-RANGE",
        question: "¿Puede confirmarse que mayor_60_min es un subconjunto de mayor_15_min y explicarse la diferencia entre los rangos y el total de transferencias?",
        reason: `Los rangos exclusivos suman ${timeBucketTotal.toLocaleString("es-EC")} frente a ${totals?.transfers.toLocaleString("es-EC") ?? "un total no disponible"}; la diferencia no se asignó a una categoría.`,
      }
    : undefined;
  const clarifyingQuestions = rangeQuestion
    ? [
        rangeQuestion,
        ...(advice.clarifyingQuestions ?? []).filter((question) => question.id !== rangeQuestion.id),
      ]
    : advice.clarifyingQuestions ?? [];

  return {
    ...advice,
    opportunities,
    recommendation: {
      ...advice.recommendation,
      action: "investigate" as const,
      rationale,
      sourceIds: [...new Set([...dataQualitySourceIds, ...segmentSourceIds])],
      pendingIssues: [
        ...(hasUnreconciled
          ? ["Confirmar la semántica de mayor_60_min y conciliar los rangos con el total."]
          : ["Corregir o confirmar los registros señalados en las advertencias."]),
        "Recalcular antes de comparar segmentos o recomendar una solución.",
      ],
    },
    clarifyingQuestion: advice.clarifyingQuestion ?? (rangeQuestion
      ? { question: rangeQuestion.question, reason: rangeQuestion.reason }
      : undefined),
    clarifyingQuestions,
  };
}

function applyDemandComparison(
  advice: Awaited<ReturnType<typeof opportunityAdviceSchema.parse>>,
  comparison: QuantitativeDemandComparison,
) {
  if (comparison.status !== "contradicted") return advice;
  const comparisonEvidence =
    `La evidencia cuantitativa contradice la afirmación numérica de la demanda. ${comparison.explanation}`;
  return {
    ...advice,
    opportunities: advice.opportunities.map((opportunity, index) =>
      index === 0
        ? {
            ...opportunity,
            rationale: `${opportunity.rationale} ${comparisonEvidence}`,
            supportingEvidence: [comparisonEvidence, ...opportunity.supportingEvidence],
            uncertainties: [...new Set([
              ...opportunity.uncertainties,
              "Confirmar la discrepancia con evidencia comparable antes de decidir una intervención.",
            ])],
            sourceIds: [...new Set([...opportunity.sourceIds, ...comparison.sourceIds])],
            alternatives: opportunity.alternatives.map((alternative) => ({
              ...alternative,
              sourceIds: [...new Set([...alternative.sourceIds, ...comparison.sourceIds])],
              evaluation: {
                ...alternative.evaluation,
                sourceIds: [...new Set([...alternative.evaluation.sourceIds, ...comparison.sourceIds])],
              },
            })),
          }
        : opportunity,
    ),
    recommendation: {
      ...advice.recommendation,
      action: "investigate" as const,
      rationale: `${advice.recommendation.rationale} ${comparisonEvidence}`,
      sourceIds: [...new Set([...advice.recommendation.sourceIds, ...comparison.sourceIds])],
      pendingIssues: [
        ...new Set([
          ...advice.recommendation.pendingIssues,
          "Revisar la afirmación numérica de la demanda frente al indicador y sus limitaciones.",
        ]),
      ],
    },
  };
}

function addClarificationClaims(
  evidence: EvidenceAnalysis,
  clarificationSources: EvidenceSource[],
): EvidenceAnalysis {
  if (clarificationSources.length === 0) return evidence;

  return {
    ...evidence,
    claims: [
      ...evidence.claims,
      ...clarificationSources.flatMap((source) => [
        {
          type: "requester_statement" as const,
          text: `Respuesta del PO: ${source.excerpt}`,
          sourceIds: [source.id],
        },
        {
          type: "hypothesis" as const,
          text: "Si la condición descrita por el PO se confirma con evidencia independiente, podría orientar la siguiente validación; no confirma causa ni impacto.",
          sourceIds: [source.id],
        },
      ]),
    ],
  };
}

function applyClarificationContext(
  advice: Awaited<ReturnType<typeof opportunityAdviceSchema.parse>>,
  clarificationSources: EvidenceSource[],
) {
  if (clarificationSources.length === 0) return advice;
  const clarificationSourceIds = clarificationSources.map((source) => source.id);
  const supportingEvidence = clarificationSources.map(
    (source) => `Respuesta del PO: ${source.excerpt} (fuente ${source.id}).`,
  );
  const changes = clarificationSources.map(
    (source) => `La respuesta del PO se incorporó como fuente ${source.id}; su contenido requiere contraste independiente.`,
  );

  return {
    ...advice,
    opportunities: advice.opportunities.map((opportunity, index) =>
      index === 0
        ? {
            ...opportunity,
            rationale: `${opportunity.rationale} La respuesta aclaratoria se incorpora como declaración y no sustituye evidencia independiente.`,
            supportingEvidence: [...opportunity.supportingEvidence, ...supportingEvidence],
            sourceIds: [...new Set([...opportunity.sourceIds, ...clarificationSourceIds])],
          }
        : opportunity,
    ),
    recommendation: {
      ...advice.recommendation,
      rationale: `${advice.recommendation.rationale} La respuesta del PO se incorporó como evidencia declarada y debe contrastarse antes de decidir.`,
      sourceIds: [...new Set([...advice.recommendation.sourceIds, ...clarificationSourceIds])],
    },
    clarifyingQuestion: undefined,
    clarifyingQuestions: [],
    changesSinceClarification: [...new Set([
      ...(advice.changesSinceClarification ?? []),
      ...changes,
    ])],
  };
}

export async function runAnalysis(
  input: AnalysisInput,
  provider: AnalysisProvider = createAnalysisProvider(),
): Promise<AnalysisResponse> {
  const sourceId = "S001";
  const quantitativeDemandComparison = compareDemandToQuantitative(
    input.demand,
    input.quantitativeAnalysis,
  );
  const frameRaw = await structureDemand(
    input.demand,
    sourceId,
    provider,
    input.quantitativeAnalysis,
  );
  const frame = demandFrameSchema.parse(frameRaw);
  if (input.quantitativeAnalysis) {
    frame.ambiguities = frame.ambiguities.filter(
      (ambiguity) => !/no hay evidencia cuantitativa/i.test(ambiguity),
    );
    frame.ambiguities.push(
      "Los cálculos describen datos agregados y sintéticos; no establecen causalidad ni confirman experiencias individuales.",
    );
  }
  frame.sourceIds.forEach((id) => assertSourceReferences([id], input.sources));

  const clarificationSources = input.sources.filter(
    (source) => source.sourceType === "clarification",
  );
  const evidenceRaw = await analyzeEvidence(
    input.demand,
    frame,
    sourceId,
    provider,
    input.sources,
    input.quantitativeAnalysis,
    input.clarifications,
  );
  const evidence = addClarificationClaims(
    evidenceAnalysisSchema.parse(evidenceRaw),
    clarificationSources,
  );

  const adviceRaw = await adviseOpportunity(
    input.demand,
    frame,
    evidence,
    provider,
    input.clarifications,
    input.quantitativeAnalysis,
  );
  const parsedAdvice = opportunityAdviceSchema.parse(adviceRaw);
  const advice = applyClarificationContext(
    applyDemandComparison(
      applyQuantitativeAdvice(parsedAdvice, input.quantitativeAnalysis, input.sources),
      quantitativeDemandComparison,
    ),
    clarificationSources,
  );
  const quantitativeClaims = input.quantitativeAnalysis?.findings.map(quantifiedClaim) ?? [];
  const contradictionClaims = quantitativeDemandComparison.status === "contradicted"
    ? [{
        type: "calculated_data" as const,
        text: `La evidencia cuantitativa contradice la afirmación de la demanda. ${quantitativeDemandComparison.explanation}`,
        sourceIds: quantitativeDemandComparison.sourceIds,
      }]
    : [];
  const evidenceClaims = input.quantitativeAnalysis
    ? evidence.claims.filter((claim) =>
        !(claim.type === "missing_information" &&
          /no se aportaron datos verificables/i.test(claim.text)),
      )
    : evidence.claims;
  const claims = [...evidenceClaims, ...quantitativeClaims, ...contradictionClaims];
  const missingInformation = input.quantitativeAnalysis
    ? [
        ...evidence.missingInformation.filter(
          (item) => !/información verificable sobre frecuencia y alcance/i.test(item),
        ),
        "Datos sintéticos o públicos representativos para validar el patrón en el contexto de clientes.",
        ...(input.quantitativeAnalysis.totals?.unreconciledTimeTransfers
          ? ["Conciliar los rangos de tiempo con el total y confirmar la semántica de mayor_60_min."]
          : []),
      ]
    : evidence.missingInformation;
  const limitations = input.quantitativeAnalysis?.totals
    ? [
        ...evidence.limitations,
        "Los cálculos describen registros agregados y sintéticos; no prueban causalidad ni experiencia individual.",
        ...(input.quantitativeAnalysis.status === "partial"
          ? ["Los resultados son parciales; las advertencias de calidad deben resolverse antes de priorizar."]
          : []),
      ]
    : evidence.limitations;

  for (const id of frame.sourceIds) assertSourceReferences([id], input.sources);
  claims.forEach((claim) => assertSourceReferences(claim.sourceIds, input.sources));
  advice.opportunities.forEach((opportunity) =>
    {
      assertSourceReferences(opportunity.sourceIds, input.sources);
      opportunity.alternatives.forEach((alternative) => {
        assertSourceReferences(alternative.sourceIds, input.sources);
        assertSourceReferences(alternative.evaluation.sourceIds, input.sources);
      });
    },
  );
  assertSourceReferences(advice.recommendation.sourceIds, input.sources);
  assertSourceReferences(quantitativeDemandComparison.sourceIds, input.sources);
  if (advice.recommendation.alternativeId) {
    const exists = advice.opportunities.some((opportunity) =>
      opportunity.alternatives.some(
        (alternative) => alternative.id === advice.recommendation.alternativeId,
      ),
    );
    if (!exists) throw new InvalidAnalysisResponseError();
  }

  return {
    status: "complete",
    problemFrame: frame,
    claims,
    opportunities: advice.opportunities,
    evidenceStatus: input.quantitativeAnalysis?.status === "invalid"
      ? "insufficient"
      : input.quantitativeAnalysis?.status === "partial"
        ? "partial"
        : evidence.evidenceStatus,
    missingInformation,
    recommendation: advice.recommendation,
    limitations,
    clarifyingQuestion: advice.clarifyingQuestion,
    clarifyingQuestions: advice.clarifyingQuestions ?? [],
    changesSinceClarification: advice.changesSinceClarification ?? (
      input.clarifications?.length ? ["Se incorporaron las respuestas aclaratorias al contexto del análisis."] : []
    ),
    sources: input.sources,
    warnings: [],
    quantitativeDemandComparison,
    quantitativeAnalysis: input.quantitativeAnalysis,
    fileCount: 0,
    extractedCharacters: input.demand.length,
    analysisMode: provider.mode,
  };
}
