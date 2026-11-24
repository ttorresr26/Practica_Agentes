"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import AnalysisResult from "./AnalysisResult";
import ProcessingStatus, { type ProcessingStage } from "./ProcessingStatus";
import { analysisResponseSchema } from "../lib/analysis/schemas";
import type { AnalysisResponse } from "../lib/analysis/types";
import type { ClarificationAnswer } from "../lib/analysis/types";
import { getClientFileError } from "../lib/evidence/client-validation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getApiError(value: unknown) {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.message !== "string") {
    return "No se pudo procesar la solicitud. Intenta nuevamente.";
  }
  return value.error.message;
}

export default function DemandForm() {
  const [demandError, setDemandError] = useState("");
  const [policyError, setPolicyError] = useState("");
  const [processError, setProcessError] = useState("");
  const [fileError, setFileError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [demandText, setDemandText] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    const error = getClientFileError(files);
    if (error) {
      event.currentTarget.value = "";
      setSelectedFiles([]);
      setFileError(error);
      setResult(null);
      return;
    }
    setFileError("");
    setSelectedFiles(files);
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProcessError("");

    const demand = demandText.trim();
    if (!demand) {
      setDemandError("Escribe una demanda para continuar.");
      return;
    }

    if (!policyAccepted) {
      setPolicyError("Confirma que la información es ficticia, sintética, agregada o pública.");
      return;
    }
    if (fileError) return;

    const requestData = new FormData();
    requestData.set("demand", demand);
    requestData.set("dataPolicyAccepted", "true");
    selectedFiles.forEach((file) => requestData.append("files", file, file.name));

    setProcessingStage("structure");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: requestData,
        cache: "no-store",
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        setProcessError(getApiError(body));
        return;
      }

      const parsedResult = analysisResponseSchema.safeParse(body);
      if (!parsedResult.success) {
        setProcessError("El servidor devolvió una respuesta que no se pudo interpretar.");
        return;
      }
      setResult(parsedResult.data);
    } catch {
      setProcessError("No se pudo conectar con la aplicación. Intenta nuevamente.");
    } finally {
      setProcessingStage(null);
    }
  }

  async function handleClarifications(answers: ClarificationAnswer[]) {
    if (!demandText || processingStage !== null) return;
    setProcessError("");
    setProcessingStage("evidence");

    const requestData = new FormData();
    requestData.set("demand", demandText);
    requestData.set("dataPolicyAccepted", "true");
    requestData.set("clarifications", JSON.stringify(answers));
    selectedFiles.forEach((file) => requestData.append("files", file, file.name));

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: requestData,
        cache: "no-store",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setProcessError(getApiError(body));
        return;
      }
      const parsedResult = analysisResponseSchema.safeParse(body);
      if (!parsedResult.success) {
        setProcessError("El servidor devolvió una respuesta que no se pudo interpretar.");
        return;
      }
      setResult(parsedResult.data);
    } catch {
      setProcessError("No se pudo conectar con la aplicación. Intenta nuevamente.");
    } finally {
      setProcessingStage(null);
    }
  }

  return (
    <>
      <form className="demand-form" onSubmit={handleSubmit} aria-busy={processingStage !== null}>
        <label className="field-label" htmlFor="demand">
          Describe la demanda <span>Obligatorio</span>
        </label>
        <textarea
          id="demand"
          name="demand"
          required
          disabled={processingStage !== null}
          rows={5}
          value={demandText}
          placeholder="Por ejemplo: Los clientes reportan demoras al realizar transferencias..."
          aria-invalid={Boolean(demandError)}
          aria-describedby={demandError ? "demand-error" : undefined}
          onInvalid={(event) => {
            event.preventDefault();
            setDemandError("Escribe una demanda para continuar.");
          }}
          onChange={(event) => {
            setDemandText(event.currentTarget.value);
            setDemandError("");
            setProcessError("");
            setResult(null);
          }}
        />
        {demandError && (
          <p className="form-error" id="demand-error" role="alert">
            {demandError}
          </p>
        )}
        <div className="field-hint">
          <span>Incluye solo la información necesaria.</span>
        </div>

        <div className="attachment-field">
          <label className="field-label" htmlFor="files">
            Adjuntar archivos <span>Opcional</span>
          </label>
          <input
            id="files"
            name="files"
            type="file"
            accept=".xlsx,.csv,.pdf,.docx"
            multiple
            disabled={processingStage !== null}
            onChange={handleFileChange}
            aria-describedby={fileError ? "attachment-hint file-error" : "attachment-hint"}
          />
          <p className="field-hint" id="attachment-hint">
            XLSX, CSV, PDF y DOCX. Hasta 5 archivos, 10 MB por archivo y 25 MB en total.
          </p>
          {selectedFiles.length > 0 && (
            <p className="selected-files" aria-live="polite">
              {selectedFiles.length === 1
                ? `Archivo seleccionado: ${selectedFiles[0].name}`
                : `${selectedFiles.length} archivos seleccionados`}
            </p>
          )}
          {fileError && (
            <p className="form-error" id="file-error" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <div className="data-confirmation">
          <input
            id="data-policy"
            name="dataPolicyAccepted"
            type="checkbox"
            value="true"
            required
            disabled={processingStage !== null}
            checked={policyAccepted}
            aria-invalid={Boolean(policyError)}
            aria-describedby={policyError ? "policy-error" : undefined}
            onInvalid={(event) => {
              event.preventDefault();
              setPolicyError(
                "Confirma que la información es ficticia, sintética, agregada o pública.",
              );
            }}
            onChange={(event) => {
              setPolicyAccepted(event.currentTarget.checked);
              setPolicyError("");
            }}
          />
          <label htmlFor="data-policy">
            Confirmo que la demanda y los archivos contienen únicamente información ficticia,
            sintética, agregada o pública.
          </label>
          {policyError && (
            <p className="form-error" id="policy-error" role="alert">
              {policyError}
            </p>
          )}
        </div>

        <button className="primary-button" type="submit" disabled={processingStage !== null}>
          Analizar demanda
          <span aria-hidden="true">→</span>
        </button>
        {processError && !result && (
          <p className="form-error form-notice-error" role="alert">
            {processError}
          </p>
        )}
      </form>

      {processingStage && <ProcessingStatus stage={processingStage} />}
      {result && (
        <AnalysisResult
          result={result}
          onClarificationsSubmit={handleClarifications}
          clarificationProcessing={processingStage !== null}
          clarificationError={processError}
          onClarificationEdit={() => setProcessError("")}
          onEdit={() => {
            setResult(null);
            document.getElementById("demand")?.focus();
          }}
        />
      )}
    </>
  );
}
