export type EvidenceSourceType = "demand" | "clarification" | "xlsx" | "csv" | "pdf" | "docx";
export type UploadFormat = Exclude<EvidenceSourceType, "demand" | "clarification">;
export type EvidenceValue = string | number | boolean | null;

export interface EvidenceSource {
  id: string;
  fileName: string;
  sourceType: EvidenceSourceType;
  locator: string;
  excerpt: string;
  headers?: string[];
  values?: Record<string, EvidenceValue>;
}

export type ParsedEvidenceSource = Omit<EvidenceSource, "id">;

export interface EvidenceWarning {
  fileName: string;
  locator: string;
  code: "EMPTY_SHEET" | "NO_DATA_ROWS" | "EMPTY_PAGE";
  message: string;
}

export interface UploadParseResult {
  sources: ParsedEvidenceSource[];
  warnings: EvidenceWarning[];
  extractedCharacters: number;
}

export interface EvidenceProcessingResponse {
  status: "evidence_processed";
  sources: EvidenceSource[];
  warnings: EvidenceWarning[];
  fileCount: number;
  extractedCharacters: number;
  analysis: "not_performed";
}

export interface ValidatedUpload {
  buffer: Buffer;
  fileName: string;
  format: UploadFormat;
}

export interface UploadFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}
