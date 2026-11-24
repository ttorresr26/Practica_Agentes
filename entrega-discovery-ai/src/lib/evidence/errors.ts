export type EvidenceErrorCode =
  | "DATA_POLICY_REQUIRED"
  | "SENSITIVE_CONTENT_DETECTED"
  | "EMPTY_FILE"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_MIME"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "TOTAL_SIZE_EXCEEDED"
  | "INVALID_FILE"
  | "UNREADABLE_FILE"
  | "EXTRACTED_CONTENT_TOO_LARGE"
  | "TOO_MANY_SOURCES"
  | "INVALID_REQUEST"
  | "FILES_NOT_SUPPORTED";

const httpStatusByCode: Record<EvidenceErrorCode, number> = {
  DATA_POLICY_REQUIRED: 400,
  SENSITIVE_CONTENT_DETECTED: 422,
  EMPTY_FILE: 422,
  UNSUPPORTED_FORMAT: 415,
  UNSUPPORTED_MIME: 415,
  FILE_TOO_LARGE: 413,
  TOO_MANY_FILES: 413,
  TOTAL_SIZE_EXCEEDED: 413,
  INVALID_FILE: 422,
  UNREADABLE_FILE: 422,
  EXTRACTED_CONTENT_TOO_LARGE: 413,
  TOO_MANY_SOURCES: 413,
  INVALID_REQUEST: 400,
  FILES_NOT_SUPPORTED: 400,
};

const messageByCode: Record<EvidenceErrorCode, string> = {
  DATA_POLICY_REQUIRED:
    "Confirma que la demanda y los archivos contienen únicamente información ficticia, sintética, agregada o pública.",
  SENSITIVE_CONTENT_DETECTED:
    "Se detectó contenido que podría ser información personal o confidencial. El archivo no fue procesado.",
  EMPTY_FILE: "El archivo está vacío.",
  UNSUPPORTED_FORMAT: "Formato no admitido. Usa únicamente .xlsx, .csv, .pdf o .docx.",
  UNSUPPORTED_MIME: "El tipo de contenido del archivo no coincide con un formato admitido.",
  FILE_TOO_LARGE: "Cada archivo debe pesar como máximo 10 MB.",
  TOO_MANY_FILES: "Puedes adjuntar hasta 5 archivos por solicitud.",
  TOTAL_SIZE_EXCEEDED: "El tamaño total de los archivos no puede superar 25 MB.",
  INVALID_FILE: "No se pudo leer el archivo. Verifica que no esté dañado y que corresponda a su formato.",
  UNREADABLE_FILE:
    "No se pudo extraer texto legible. Los PDF escaneados no se procesan porque este prototipo no incluye OCR.",
  EXTRACTED_CONTENT_TOO_LARGE:
    "El contenido extraído supera el límite de 80.000 caracteres. Reduce la cantidad de información y vuelve a intentarlo.",
  TOO_MANY_SOURCES:
    "El archivo contiene más de 5.000 filas o fragmentos. Divide la información y vuelve a intentarlo.",
  INVALID_REQUEST: "La solicitud no tiene el formato esperado. Revisa la demanda y los archivos.",
  FILES_NOT_SUPPORTED:
    "En esta entrega el análisis utiliza únicamente la demanda escrita. Los archivos se incorporarán más adelante.",
};

export class EvidenceError extends Error {
  readonly status: number;
  readonly code: EvidenceErrorCode;

  constructor(code: EvidenceErrorCode) {
    super(messageByCode[code]);
    this.name = "EvidenceError";
    this.code = code;
    this.status = httpStatusByCode[code];
  }
}
