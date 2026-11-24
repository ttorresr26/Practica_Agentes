import type { EvidenceSource } from "../evidence/types";
import type { EvidenceWarning } from "../evidence/types";
import type { QuantitativeAnalysis } from "../evidence/calculations";

export type AnalysisStage = "structure" | "evidence" | "advice";
export type AnalysisMode = "mock" | "openai";
export type ClaimType =
  | "requester_statement"
  | "fact"
  | "calculated_data"
  | "inference"
  | "hypothesis"
  | "missing_information"
  | "recommendation";
export type EvidenceStatus = "sufficient" | "partial" | "insufficient";
export type RecommendationAction = "investigate" | "validate" | "experiment" | "solution" | "discard";

export interface DemandFrame {
  problem: string;
  affectedGroup: string;
  ambiguities: string[];
  sourceIds: string[];
}

export interface Claim {
  type: ClaimType;
  text: string;
  sourceIds: string[];
}

export interface EvidenceAnalysis {
  evidenceStatus: EvidenceStatus;
  claims: Claim[];
  missingInformation: string[];
  limitations: string[];
}

export type EvaluationLevel = "low" | "medium" | "high";

export interface AlternativeEvaluation {
  customerValue: EvaluationLevel;
  expectedImpact: EvaluationLevel;
  technicalFeasibility: EvaluationLevel;
  complexity: EvaluationLevel;
  risks: string[];
  availableEvidence: "sufficient" | "partial" | "insufficient";
  sourceIds: string[];
}

export interface SolutionAlternative {
  id: string;
  title: string;
  description: string;
  evaluation: AlternativeEvaluation;
  sourceIds: string[];
}

export interface Opportunity {
  id: string;
  title: string;
  rationale: string;
  customerOutcome: string;
  segment: string;
  supportingEvidence: string[];
  uncertainties: string[];
  risks: string[];
  alternatives: SolutionAlternative[];
  impactPotential: EvaluationLevel;
  evidenceLevel: "sufficient" | "partial" | "insufficient";
  researchEffort: EvaluationLevel;
  sourceIds: string[];
}

export interface Recommendation {
  action: RecommendationAction;
  rationale: string;
  sourceIds: string[];
  pendingIssues: string[];
  alternativeId?: string;
}

export interface QuantitativeDemandComparison {
  status: "contradicted" | "not_contradicted" | "not_comparable";
  explanation: string;
  sourceIds: string[];
}

export interface OpportunityAdvice {
  opportunities: Opportunity[];
  recommendation: Recommendation;
  clarifyingQuestion?: {
    question: string;
    reason: string;
  };
  clarifyingQuestions?: ClarifyingQuestion[];
  changesSinceClarification?: string[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  reason: string;
}

export interface ClarificationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface AnalysisResponse {
  status: "complete";
  problemFrame: DemandFrame;
  claims: Claim[];
  opportunities: Opportunity[];
  evidenceStatus: EvidenceStatus;
  missingInformation: string[];
  recommendation: Recommendation;
  limitations: string[];
  clarifyingQuestion?: {
    question: string;
    reason: string;
  };
  sources: EvidenceSource[];
  clarifyingQuestions: ClarifyingQuestion[];
  changesSinceClarification: string[];
  warnings: EvidenceWarning[];
  quantitativeDemandComparison: QuantitativeDemandComparison;
  quantitativeAnalysis?: QuantitativeAnalysis;
  fileCount: number;
  extractedCharacters: number;
  analysisMode: AnalysisMode;
}

export interface AnalysisInput {
  demand: string;
  sources: EvidenceSource[];
  clarifications?: ClarificationAnswer[];
  quantitativeAnalysis?: QuantitativeAnalysis;
}
