import type { AnalysisResponse, Claim } from "../lib/analysis/types";
import { useState } from "react";
import type { ClarificationAnswer } from "../lib/analysis/types";
import QuantitativeInsights from "./QuantitativeInsights";

const claimLabels: Record<Claim["type"], string> = {
  requester_statement: "Declaración del solicitante",
  fact: "Hecho",
  calculated_data: "Dato calculado",
  inference: "Inferencia",
  hypothesis: "Hipótesis",
  missing_information: "Información faltante",
  recommendation: "Recomendación",
};

const recommendationLabels: Record<AnalysisResponse["recommendation"]["action"], string> = {
  investigate: "Investigar",
  validate: "Validar",
  experiment: "Experimentar",
  solution: "Proponer solución",
  discard: "Descartar o dejar en espera",
};

const evidenceLabels: Record<AnalysisResponse["evidenceStatus"], string> = {
  sufficient: "Suficiente",
  partial: "Parcial",
  insufficient: "Insuficiente",
};

const levelLabels = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

function AlternativeCard({
  alternative,
}: {
  alternative: AnalysisResponse["opportunities"][number]["alternatives"][number];
}) {
  return (
    <article className="alternative-card">
      <header>
        <code>{alternative.id}</code>
        <h4>{alternative.title}</h4>
      </header>
      <p>{alternative.description}</p>
      <dl className="evaluation-grid">
        <div>
          <dt>Valor para el cliente</dt>
          <dd>{levelLabels[alternative.evaluation.customerValue]}</dd>
        </div>
        <div>
          <dt>Impacto esperado</dt>
          <dd>{levelLabels[alternative.evaluation.expectedImpact]}</dd>
        </div>
        <div>
          <dt>Viabilidad técnica</dt>
          <dd>{levelLabels[alternative.evaluation.technicalFeasibility]}</dd>
        </div>
        <div>
          <dt>Complejidad</dt>
          <dd>{levelLabels[alternative.evaluation.complexity]}</dd>
        </div>
      </dl>
      {alternative.evaluation.risks.length > 0 && (
        <p><strong>Riesgos:</strong> {alternative.evaluation.risks.join("; ")}</p>
      )}
      <p>
        <strong>Evidencia disponible:</strong>{" "}
        {evidenceLabels[alternative.evaluation.availableEvidence]}
      </p>
      <small>Fuentes: {alternative.sourceIds.join(", ")}</small>
    </article>
  );
}

function OpportunityCard({
  opportunity,
}: {
  opportunity: AnalysisResponse["opportunities"][number];
}) {
  return (
    <article className="opportunity-card">
      <header>
        <code>{opportunity.id}</code>
        <h3>{opportunity.title}</h3>
      </header>
      <p>{opportunity.rationale}</p>
      <dl className="opportunity-details">
        <div>
          <dt>Resultado que necesita conseguir el cliente</dt>
          <dd>{opportunity.customerOutcome}</dd>
        </div>
        <div>
          <dt>Segmento afectado</dt>
          <dd>{opportunity.segment}</dd>
        </div>
      </dl>
      {opportunity.supportingEvidence.length > 0 && (
        <p><strong>Evidencia:</strong> {opportunity.supportingEvidence.join(". ")}</p>
      )}
      {opportunity.uncertainties.length > 0 && (
        <p><strong>Incertidumbres:</strong> {opportunity.uncertainties.join(". ")}</p>
      )}
      {opportunity.risks.length > 0 && (
        <p><strong>Riesgos:</strong> {opportunity.risks.join(". ")}</p>
      )}
      <p>
        <strong>Impacto potencial:</strong> {levelLabels[opportunity.impactPotential]} ·{" "}
        <strong>Evidencia:</strong> {evidenceLabels[opportunity.evidenceLevel]} ·{" "}
        <strong>Esfuerzo de investigación:</strong> {levelLabels[opportunity.researchEffort]}
      </p>
      <h4>Alternativas de solución</h4>
      <div className="alternative-list">
        {opportunity.alternatives.map((alternative) => (
          <AlternativeCard key={alternative.id} alternative={alternative} />
        ))}
      </div>
      <small>Fuentes de la oportunidad: {opportunity.sourceIds.join(", ")}</small>
    </article>
  );
}

export default function AnalysisResult({
  result,
  onClarificationsSubmit,
  clarificationProcessing = false,
  clarificationError = "",
  onClarificationEdit,
  onEdit,
}: {
  result: AnalysisResponse;
  onClarificationsSubmit?: (answers: ClarificationAnswer[]) => void | Promise<void>;
  clarificationProcessing?: boolean;
  clarificationError?: string;
  onClarificationEdit?: () => void;
  onEdit?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [localClarificationError, setLocalClarificationError] = useState("");
  const displayedClarificationError = clarificationError || localClarificationError;
  const questions = result.clarifyingQuestions.length > 0
    ? result.clarifyingQuestions
    : result.clarifyingQuestion
      ? [{ id: "Q1", ...result.clarifyingQuestion }]
      : [];

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function exportHtml() {
    const claims = result.claims
      .map((claim) => `<li><strong>${escapeHtml(claimLabels[claim.type])}:</strong> ${escapeHtml(claim.text)} (${claim.sourceIds.join(", ")})</li>`)
      .join("");
    const opportunities = result.opportunities
      .map((opportunity) =>
        `<section><h3>${escapeHtml(opportunity.title)}</h3><p>${escapeHtml(opportunity.rationale)}</p><p><strong>Resultado:</strong> ${escapeHtml(opportunity.customerOutcome)}</p><p><strong>Segmento:</strong> ${escapeHtml(opportunity.segment)}</p></section>`,
      )
      .join("");
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Informe Discovery AI</title><body><h1>Informe Discovery AI Assistant</h1><h2>Problema</h2><p>${escapeHtml(result.problemFrame.problem)}</p><h2>Grupo afectado</h2><p>${escapeHtml(result.problemFrame.affectedGroup)}</p><h2>Afirmaciones</h2><ul>${claims}</ul><h2>Oportunidades</h2>${opportunities}<h2>Recomendación</h2><p><strong>${recommendationLabels[result.recommendation.action]}:</strong> ${escapeHtml(result.recommendation.rationale)}</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "descubrimiento-discovery-ai.html";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submitClarifications() {
    if (!onClarificationsSubmit) return;
    setLocalClarificationError("");
    try {
      await onClarificationsSubmit(
        questions.map((question) => ({
          questionId: question.id,
          question: question.question,
          answer: answers[question.id].trim(),
        })),
      );
    } catch {
      setLocalClarificationError(
        "No se pudo incorporar la respuesta. El análisis anterior se mantiene.",
      );
    }
  }

  return (
    <section className="analysis-results" aria-labelledby="analysis-results-title">
      <p className="eyebrow" role="status" aria-live="polite">
        {result.quantitativeAnalysis
          ? `Cálculos cuantitativos locales · análisis cualitativo ${result.analysisMode === "openai" ? "con OpenAI" : "simulado"}`
          : result.analysisMode === "openai"
            ? "Análisis cualitativo con OpenAI"
            : "Análisis simulado completado"}
      </p>
      <h2 id="analysis-results-title">Marco de descubrimiento</h2>
      <div className="report-actions">
        {onEdit && (
          <button className="secondary-button" type="button" onClick={onEdit}>
            Volver y editar la demanda
          </button>
        )}
        <button className="secondary-button" type="button" onClick={exportHtml}>
          Descargar informe HTML
        </button>
        <button className="secondary-button" type="button" onClick={() => window.print()}>
          Exportar / imprimir como PDF
        </button>
      </div>

      <div className="analysis-summary">
        <article>
          <h3>Problema del cliente</h3>
          <p>{result.problemFrame.problem}</p>
        </article>
        <article>
          <h3>Grupo afectado</h3>
          <p>{result.problemFrame.affectedGroup}</p>
        </article>
        <article>
          <h3>Suficiencia de evidencia</h3>
          <p>
            <strong>{evidenceLabels[result.evidenceStatus]}</strong>
          </p>
        </article>
      </div>

      {result.quantitativeAnalysis && (
        <QuantitativeInsights
          analysis={result.quantitativeAnalysis}
          comparison={result.quantitativeDemandComparison}
        />
      )}

      <div className="analysis-block">
        <h3>Evidencias y fuentes</h3>
        {result.sources.map((source) => (
          <article className="evidence-source" key={source.id}>
            <header className="evidence-source-heading">
              <code>{source.id}</code>
              <div>
                <strong>{source.fileName}</strong>
                <span>{source.locator}</span>
              </div>
            </header>
            {source.headers && (
              <p className="evidence-headers">Encabezados: {source.headers.join(" · ")}</p>
            )}
            {source.values && (
              <dl className="evidence-values">
                {Object.entries(source.values).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value === null ? "Sin valor" : String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="evidence-excerpt">{source.excerpt}</p>
          </article>
        ))}
        {result.warnings.length > 0 && (
          <ul className="evidence-warnings">
            {result.warnings.map((warning, index) => (
              <li key={`${warning.fileName}-${warning.locator}-${index}`}>
                <strong>{warning.fileName}</strong> · {warning.locator}: {warning.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.problemFrame.ambiguities.length > 0 && (
        <div className="analysis-block">
          <h3>Ambigüedades</h3>
          <ul>
            {result.problemFrame.ambiguities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="analysis-block">
        <h3>Afirmaciones organizadas</h3>
        {result.claims.length === 0 ? (
          <p className="analysis-empty">No se generaron afirmaciones verificables.</p>
        ) : (
          <ul className="claim-list">
            {result.claims.map((claim, index) => (
              <li key={`${claim.type}-${index}`}>
                <span className={`claim-label claim-${claim.type}`}>{claimLabels[claim.type]}</span>
                <p>{claim.text}</p>
                {claim.sourceIds.length > 0 && (
                  <small>Fuentes: {claim.sourceIds.join(", ")}</small>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="analysis-block">
        <h3>Información faltante</h3>
        {result.missingInformation.length > 0 ? (
          <ul>
            {result.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="analysis-empty">No se señaló información faltante adicional.</p>
        )}
      </div>

      <div className="analysis-block">
        <h3>Oportunidades candidatas</h3>
        {result.opportunities.map((opportunity, index) => (
          <OpportunityCard key={opportunity.id || `${opportunity.title}-${index}`} opportunity={opportunity} />
        ))}
      </div>

      <div className="recommendation-card">
        <p className="eyebrow">Recomendación</p>
        <h3>{recommendationLabels[result.recommendation.action]}</h3>
        {result.recommendation.alternativeId && (
          <p>
            <strong>Alternativa sugerida:</strong>{" "}
            {result.opportunities
              .flatMap((opportunity) => opportunity.alternatives)
              .find((alternative) => alternative.id === result.recommendation.alternativeId)?.title ??
              result.recommendation.alternativeId}
          </p>
        )}
        <p>{result.recommendation.rationale}</p>
        {result.recommendation.pendingIssues.length > 0 && (
          <ul>
            {result.recommendation.pendingIssues.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <small>Fuentes: {result.recommendation.sourceIds.join(", ")}</small>
      </div>

      {result.limitations.length > 0 && (
        <div className="analysis-limitations">
          <h3>Limitaciones del análisis</h3>
          <ul>
            {result.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {questions.length > 0 && (
        <div className="analysis-block">
          <h3>Preguntas aclaratorias</h3>
          {questions.map((question) => (
            <div className="clarification-item" key={question.id}>
              <p><strong>{question.question}</strong></p>
              <p>{question.reason}</p>
              <label htmlFor={`clarification-${question.id}`}>
                Respuesta del PO
                <textarea
                  id={`clarification-${question.id}`}
                  rows={3}
                  value={answers[question.id] ?? ""}
                  disabled={clarificationProcessing}
                  aria-invalid={Boolean(displayedClarificationError)}
                  aria-describedby={displayedClarificationError ? "clarification-error" : undefined}
                  onChange={(event) => {
                    const answer = event.currentTarget.value;
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: answer,
                    }));
                    setLocalClarificationError("");
                    onClarificationEdit?.();
                  }}
                  placeholder="Describe la respuesta sintética o pública"
                />
              </label>
            </div>
          ))}
          {displayedClarificationError && (
            <p className="form-error" id="clarification-error" role="alert">
              {displayedClarificationError}
            </p>
          )}
          {onClarificationsSubmit && (
            <button
              className="secondary-button"
              type="button"
              disabled={
                clarificationProcessing ||
                questions.some((question) => !answers[question.id]?.trim())
              }
              onClick={() => void submitClarifications()}
            >
              {clarificationProcessing ? "Reanalizando…" : "Incorporar respuestas y recalcular"}
            </button>
          )}
        </div>
      )}

      {result.changesSinceClarification.length > 0 && (
        <div className="analysis-limitations">
          <h3>Cambios después de las respuestas</h3>
          <ul>
            {result.changesSinceClarification.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
