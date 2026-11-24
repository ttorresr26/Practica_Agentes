import { z } from "zod";

const sourceIdsSchema = z.array(z.string().regex(/^S\d{3}$/)).min(1);
export const clarificationAnswersSchema = z.array(z.object({
  questionId: z.string().trim().min(1).max(100),
  question: z.string().trim().min(1).max(2_000),
  answer: z.string().trim().min(1).max(4_000),
})).min(1).max(10);
const claimTypeSchema = z.enum([
  "requester_statement",
  "fact",
  "calculated_data",
  "inference",
  "hypothesis",
  "missing_information",
  "recommendation",
]);

export const demandFrameSchema = z.object({
  problem: z.string().min(1),
  affectedGroup: z.string().min(1),
  ambiguities: z.array(z.string()),
  sourceIds: sourceIdsSchema,
});

export const evidenceAnalysisSchema = z.object({
  evidenceStatus: z.enum(["sufficient", "partial", "insufficient"]),
  claims: z.array(
    z.object({
      type: claimTypeSchema,
      text: z.string().min(1),
      sourceIds: z.array(z.string().regex(/^S\d{3}$/)),
    }),
  ),
  missingInformation: z.array(z.string()),
  limitations: z.array(z.string()),
});

export const opportunityAdviceSchema = z.object({
  opportunities: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      rationale: z.string().min(1),
      customerOutcome: z.string().min(1),
      segment: z.string().min(1),
      supportingEvidence: z.array(z.string()),
      uncertainties: z.array(z.string()),
      risks: z.array(z.string()),
      alternatives: z.array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
          evaluation: z.object({
            customerValue: z.enum(["low", "medium", "high"]),
            expectedImpact: z.enum(["low", "medium", "high"]),
            technicalFeasibility: z.enum(["low", "medium", "high"]),
            complexity: z.enum(["low", "medium", "high"]),
            risks: z.array(z.string()),
            availableEvidence: z.enum(["sufficient", "partial", "insufficient"]),
            sourceIds: sourceIdsSchema,
          }),
          sourceIds: sourceIdsSchema,
        }),
      ).min(1).max(3),
      impactPotential: z.enum(["low", "medium", "high"]),
      evidenceLevel: z.enum(["sufficient", "partial", "insufficient"]),
      researchEffort: z.enum(["low", "medium", "high"]),
      sourceIds: sourceIdsSchema,
    }),
  ),
  recommendation: z.object({
    action: z.enum(["investigate", "validate", "experiment", "solution", "discard"]),
    rationale: z.string().min(1),
    sourceIds: sourceIdsSchema,
    pendingIssues: z.array(z.string()),
    alternativeId: z.string().optional(),
  }),
  clarifyingQuestion: z.object({
    question: z.string().min(1),
    reason: z.string().min(1),
  }).optional(),
  clarifyingQuestions: z.array(z.object({
    id: z.string(),
    question: z.string().min(1),
    reason: z.string().min(1),
  })).default([]),
  changesSinceClarification: z.array(z.string()).default([]),
});

const quantitativeMeasureSchema = z.object({
  count: z.number().int().nonnegative(),
  percentage: z.number().finite().nonnegative(),
  sourceIds: sourceIdsSchema,
});

const quantitativeSegmentSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  totalTransfers: z.number().int().positive(),
  delayedTransfers: z.number().int().nonnegative(),
  delayPercentage: z.number().finite().nonnegative(),
  over60Count: z.number().int().nonnegative(),
  over60Percentage: z.number().finite().nonnegative(),
  complaintCount: z.number().int().nonnegative(),
  complaintPercentage: z.number().finite().nonnegative(),
  complaintsPer1000: z.number().finite().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  failurePercentage: z.number().finite().nonnegative(),
  sourceIds: sourceIdsSchema,
});

const quantitativeAnalysisSchema = z.object({
  status: z.enum(["valid", "partial", "invalid"]),
  delayDefinition: z.string().min(1),
  recordsReceived: z.number().int().nonnegative(),
  recordsUsed: z.number().int().nonnegative(),
  recordsRejected: z.number().int().nonnegative(),
  totals: z.object({
    transfers: z.number().int().positive(),
    timeDistribution: z.array(z.object({
      key: z.enum(["under_1", "1_to_5", "5_to_15", "15_to_60", "over_60"]),
      label: z.string().min(1),
      count: z.number().int().nonnegative(),
      percentage: z.number().finite().nonnegative(),
      sourceIds: sourceIdsSchema,
    })).length(5),
    delays: quantitativeMeasureSchema,
    over60: quantitativeMeasureSchema,
    complaints: quantitativeMeasureSchema,
    complaintsPer1000: z.number().finite().nonnegative(),
    failures: quantitativeMeasureSchema,
    unreconciledTimeTransfers: z.number().int(),
  }).optional(),
  segments: z.object({
    byChannel: z.array(quantitativeSegmentSchema),
    byDaypart: z.array(quantitativeSegmentSchema),
    byPeriod: z.array(quantitativeSegmentSchema),
    byCombined: z.array(quantitativeSegmentSchema),
  }),
  findings: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(["fact", "calculated_data", "inference", "hypothesis"]),
    title: z.string().min(1),
    observation: z.string().min(1),
    magnitude: z.string().min(1),
    segment: z.string().min(1),
    period: z.string().min(1),
    customerImplication: z.string().min(1),
    hypothesis: z.string().optional(),
    sourceIds: sourceIdsSchema,
    evidenceSufficiency: z.enum(["partial", "insufficient"]),
    limitations: z.array(z.string().min(1)),
  })),
  periodTrend: z.object({
    status: z.enum(["available", "insufficient"]),
    direction: z.enum(["improving", "worsening", "stable", "insufficient"]),
    percentagePointChange: z.number().finite().nullable(),
    fromPeriod: z.string().nullable(),
    toPeriod: z.string().nullable(),
    sourceIds: z.array(z.string().regex(/^S\d{3}$/)),
  }),
  associations: z.array(z.object({
    key: z.enum(["delay_complaints", "delay_failures"]),
    label: z.string().min(1),
    sampleSegmentCount: z.number().int().nonnegative(),
    coefficient: z.number().finite().min(-1).max(1).nullable(),
    sourceIds: z.array(z.string().regex(/^S\d{3}$/)),
    interpretation: z.string().min(1),
  })),
  warnings: z.array(z.object({
    fileName: z.string(),
    locator: z.string(),
    code: z.enum([
      "MISSING_HEADER",
      "INVALID_ROW",
      "INCONSISTENT_TIME_BUCKETS",
      "UNRECONCILED_TIME_BUCKETS",
      "INCIDENT_COUNT_EXCEEDS_TOTAL",
      "DUPLICATE_ROW",
      "CONFLICTING_DUPLICATE_DIMENSION",
    ]),
    message: z.string(),
  })),
});

export const analysisResponseSchema = z.object({
  status: z.literal("complete"),
  problemFrame: demandFrameSchema,
  claims: z.array(
    z.object({
      type: claimTypeSchema,
      text: z.string().min(1),
      sourceIds: z.array(z.string().regex(/^S\d{3}$/)),
    }),
  ),
  opportunities: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      rationale: z.string().min(1),
      customerOutcome: z.string().min(1),
      segment: z.string().min(1),
      supportingEvidence: z.array(z.string()),
      uncertainties: z.array(z.string()),
      risks: z.array(z.string()),
      alternatives: z.array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
          evaluation: z.object({
            customerValue: z.enum(["low", "medium", "high"]),
            expectedImpact: z.enum(["low", "medium", "high"]),
            technicalFeasibility: z.enum(["low", "medium", "high"]),
            complexity: z.enum(["low", "medium", "high"]),
            risks: z.array(z.string()),
            availableEvidence: z.enum(["sufficient", "partial", "insufficient"]),
            sourceIds: z.array(z.string().regex(/^S\d{3}$/)).min(1),
          }),
          sourceIds: z.array(z.string().regex(/^S\d{3}$/)).min(1),
        }),
      ).min(1).max(3),
      impactPotential: z.enum(["low", "medium", "high"]).default("medium"),
      evidenceLevel: z.enum(["sufficient", "partial", "insufficient"]).default("partial"),
      researchEffort: z.enum(["low", "medium", "high"]).default("medium"),
      sourceIds: z.array(z.string().regex(/^S\d{3}$/)).min(1),
    }),
  ),
  evidenceStatus: z.enum(["sufficient", "partial", "insufficient"]),
  missingInformation: z.array(z.string()),
  recommendation: z.object({
    action: z.enum(["investigate", "validate", "experiment", "solution", "discard"]),
    rationale: z.string().min(1),
    sourceIds: z.array(z.string().regex(/^S\d{3}$/)).min(1),
    pendingIssues: z.array(z.string()),
    alternativeId: z.string().optional(),
  }),
  limitations: z.array(z.string()),
  clarifyingQuestion: z.object({
    question: z.string().min(1),
    reason: z.string().min(1),
  }).optional(),
  sources: z.array(
    z.object({
      id: z.string(),
      fileName: z.string(),
      sourceType: z.enum(["demand", "clarification", "xlsx", "csv", "pdf", "docx"]),
      locator: z.string(),
      excerpt: z.string(),
    }),
  ),
  clarifyingQuestions: z.array(z.object({
    id: z.string(),
    question: z.string().min(1),
    reason: z.string().min(1),
  })).default([]),
  changesSinceClarification: z.array(z.string()).default([]),
  warnings: z.array(
    z.object({
      fileName: z.string(),
      locator: z.string(),
      code: z.enum(["EMPTY_SHEET", "NO_DATA_ROWS", "EMPTY_PAGE"]),
      message: z.string(),
    }),
  ).default([]),
  quantitativeDemandComparison: z.object({
    status: z.enum(["contradicted", "not_contradicted", "not_comparable"]),
    explanation: z.string().min(1),
    sourceIds: z.array(z.string().regex(/^S\d{3}$/)),
  }),
  quantitativeAnalysis: quantitativeAnalysisSchema.optional(),
  fileCount: z.number().int().nonnegative().default(0),
  extractedCharacters: z.number().int().nonnegative().default(0),
  analysisMode: z.enum(["mock", "openai"]).default("mock"),
});
