import type {
  QuantitativeAnalysis,
  QuantitativeMeasure,
  QuantitativeSegment,
} from "../lib/evidence/calculations";
import type { QuantitativeDemandComparison } from "../lib/analysis/types";

const findingLabels: Record<QuantitativeAnalysis["findings"][number]["kind"], string> = {
  fact: "Dato de origen",
  calculated_data: "Cálculo",
  inference: "Inferencia",
  hypothesis: "Hipótesis",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(value);
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}%`;
}

function formatPercentagePoints(value: number) {
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: "always",
  }).format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatCoefficient(value: number | null) {
  return value === null
    ? "No calculable"
    : new Intl.NumberFormat("es-EC", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value);
}

function MeasureCard({
  label,
  measure,
}: {
  label: string;
  measure: QuantitativeMeasure;
}) {
  return (
    <article className="quant-kpi">
      <span>{label}</span>
      <strong>{formatPercentage(measure.percentage)}</strong>
      <small>{formatNumber(measure.count)} registros</small>
    </article>
  );
}

function SegmentBars({
  title,
  segments,
  metric,
}: {
  title: string;
  segments: QuantitativeSegment[];
  metric: "delayPercentage" | "complaintPercentage" | "failurePercentage";
}) {
  return (
    <section className="quant-chart" aria-label={title}>
      <h4>{title}</h4>
      {segments.map((segment) => {
        const percentage = segment[metric];
        return (
          <div className="quant-bar-row" key={segment.key}>
            <span className="quant-bar-label">{segment.label}</span>
            <div
              className="quant-bar-track"
              role="progressbar"
              aria-label={`${segment.label}: ${formatPercentage(percentage)}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
            >
              <span className="quant-bar-fill" style={{ width: `${percentage}%` }} />
            </div>
            <strong>{formatPercentage(percentage)}</strong>
            <small>{formatNumber(segment.totalTransfers)} transferencias</small>
          </div>
        );
      })}
    </section>
  );
}

export default function QuantitativeInsights({
  analysis,
  comparison,
}: {
  analysis: QuantitativeAnalysis;
  comparison: QuantitativeDemandComparison;
}) {
  const totals = analysis.totals;
  const reconciliationWarnings = analysis.warnings.filter(
    (warning) => warning.code === "UNRECONCILED_TIME_BUCKETS",
  );
  const timeBucketTotal = totals?.timeDistribution.reduce((sum, bucket) => sum + bucket.count, 0) ?? 0;
  const rangeDifference = totals ? totals.transfers - timeBucketTotal : 0;

  return (
    <section className="analysis-block quantitative-analysis" aria-label="Análisis cuantitativo">
      <h3>ANÁLISIS DE EVIDENCIA CUANTITATIVA</h3>
      <p className="quant-method-note">
        Cálculos locales, deterministas y ponderados por volumen. Mayor de 60 minutos se trata como subconjunto
        de mayor_15_min y no se suma dos veces. Los agregados describen este conjunto y no demuestran causalidad
        ni experiencia individual.
      </p>

      {analysis.status !== "valid" && (
        <div className="quant-quality-warning" role="status">
          <strong>
            {analysis.status === "partial"
              ? "Cálculo parcial"
              : "No se pudo calcular con datos válidos"}
          </strong>
          <span>
            Registros recibidos: {analysis.recordsReceived}; utilizados: {analysis.recordsUsed};
            {" "}omitidos: {analysis.recordsRejected}.
          </span>
        </div>
      )}

      {totals ? (
        <>
          <div className="quant-kpi-grid" aria-label="Indicadores clave">
            <article className="quant-kpi">
              <span>Transferencias totales</span>
              <strong>{formatNumber(totals.transfers)}</strong>
              <small>{analysis.recordsUsed} registros válidos</small>
            </article>
            <MeasureCard label="En 5 minutos o más" measure={totals.delays} />
            <MeasureCard label="Más de 60 minutos" measure={totals.over60} />
            <article className="quant-kpi">
              <span>Reclamos por cada 1.000 transferencias</span>
              <strong>{formatRate(totals.complaintsPer1000)}</strong>
              <small>{formatNumber(totals.complaints.count)} reclamos reportados</small>
            </article>
            <MeasureCard label="Fallidas o reversadas" measure={totals.failures} />
          </div>

          {(rangeDifference !== 0 || reconciliationWarnings.length > 0) && (
            <div className="quant-quality-warning" role="status" aria-label="Diferencia no conciliada">
              <strong>
                {rangeDifference > 0
                  ? `Diferencia no conciliada de ${formatNumber(rangeDifference)} transferencias`
                  : rangeDifference < 0
                    ? `Los rangos exceden el total por ${formatNumber(Math.abs(rangeDifference))} transferencias`
                    : `Diferencias por fila en ${reconciliationWarnings.length} registros`}
              </strong>
              <span>
                Los rangos exclusivos suman {formatNumber(timeBucketTotal)} frente a {formatNumber(totals.transfers)} transferencias declaradas.
                {" "}{reconciliationWarnings.length} de {analysis.recordsReceived} registros recibidos presentan diferencias; se usaron {analysis.recordsUsed} y se omitieron {analysis.recordsRejected}.
                {" "}mayor_60_min se descuenta de mayor_15_min para calcular 15–60 y se cuenta una sola vez como más de 60 minutos. La discrepancia permanece en los datos de origen y no se asigna a un rango.
              </span>
            </div>
          )}

          <section className="quant-chart" aria-label="Distribución de tiempos">
            <h4>Distribución de tiempos</h4>
            {totals.timeDistribution.map((bucket) => (
              <div className="quant-bar-row" key={bucket.key}>
                <span className="quant-bar-label">{bucket.label}</span>
                <div
                  className="quant-bar-track"
                  role="progressbar"
                  aria-label={`${bucket.label}: ${formatPercentage(bucket.percentage)}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={bucket.percentage}
                >
                  <span className="quant-bar-fill" style={{ width: `${bucket.percentage}%` }} />
                </div>
                <strong>{formatPercentage(bucket.percentage)}</strong>
                <small>{formatNumber(bucket.count)}</small>
              </div>
            ))}
          </section>

          <div className="quant-chart-grid">
            <SegmentBars
              title="Comparativo por canal · demoras ≥5 min"
              segments={analysis.segments.byChannel}
              metric="delayPercentage"
            />
            <SegmentBars
              title="Comparativo por franja horaria · demoras ≥5 min"
              segments={analysis.segments.byDaypart}
              metric="delayPercentage"
            />
            <SegmentBars
              title="Evolución por periodo · demoras ≥5 min"
              segments={analysis.segments.byPeriod}
              metric="delayPercentage"
            />
          </div>

          <div className="quant-chart-grid">
            <section className="quant-chart quant-trend" aria-label="Tendencia temporal">
              <h4>Tendencia temporal</h4>
              <strong>
                {analysis.periodTrend.direction === "improving"
                  ? "Mejora observada"
                  : analysis.periodTrend.direction === "worsening"
                    ? "Empeora en el periodo más reciente"
                    : analysis.periodTrend.direction === "stable"
                      ? "Sin cambio observado"
                      : "Evidencia temporal insuficiente"}
              </strong>
              {analysis.periodTrend.status === "available" && (
                <p>
                  {analysis.periodTrend.fromPeriod} a {analysis.periodTrend.toPeriod}:{" "}
                  {formatPercentagePoints(analysis.periodTrend.percentagePointChange ?? 0)} puntos porcentuales.
                </p>
              )}
              <small>Comparación descriptiva; no establece una tendencia causal.</small>
            </section>

            <section className="quant-chart" aria-label="Asociación entre demoras e incidentes">
              <h4>Relación descriptiva entre indicadores</h4>
              {analysis.associations.map((association) => (
                <p className="quant-association" key={association.key}>
                  <strong>{association.label}: r = {formatCoefficient(association.coefficient)}</strong>
                  <span>{association.interpretation}</span>
                  <small>Fuentes: {association.sourceIds.join(", ")}</small>
                </p>
              ))}
            </section>
          </div>

          <section className="quant-table-section" aria-label="Contraste con la demanda">
            <h4>Contraste con la demanda</h4>
            <p className={`quant-comparison quant-comparison-${comparison.status}`}>
              <strong>
                {comparison.status === "contradicted"
                  ? "La demanda contradice los datos"
                  : comparison.status === "not_contradicted"
                    ? "La afirmación no contradice los datos"
                    : "No comparable con la demanda"}
              </strong>
              <span>{comparison.explanation}</span>
              {comparison.sourceIds.length > 0 && (
                <small>Fuentes: {comparison.sourceIds.join(", ")}</small>
              )}
            </p>
          </section>

          <section className="quant-table-section" aria-label="Reclamos y transferencias fallidas">
            <h4>Reclamos y transferencias fallidas</h4>
            <div className="quant-table-scroll">
              <table className="quant-table">
                <thead>
                  <tr>
                    <th scope="col">Periodo · canal · franja</th>
                    <th scope="col">Transferencias</th>
                    <th scope="col">Reclamos</th>
                    <th scope="col">Tasa de reclamos</th>
                    <th scope="col">Fallidas/reversadas</th>
                    <th scope="col">Tasa de fallidas</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.segments.byCombined.map((segment) => (
                    <tr key={segment.key}>
                      <th scope="row">{segment.label}</th>
                      <td>{formatNumber(segment.totalTransfers)}</td>
                      <td>{formatNumber(segment.complaintCount)}</td>
                      <td>{formatPercentage(segment.complaintPercentage)}</td>
                      <td>{formatNumber(segment.failureCount)}</td>
                      <td>{formatPercentage(segment.failurePercentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="analysis-empty">
          No se muestran porcentajes porque no hay registros válidos para calcularlos.
        </p>
      )}

      {analysis.findings.length > 0 && (
        <section className="quant-table-section" aria-label="Hallazgos cuantitativos">
          <h4>Hallazgos para el descubrimiento</h4>
          <div className="quant-table-scroll">
            <table className="quant-table quant-findings-table">
              <thead>
                <tr>
                  <th scope="col">Tipo</th>
                  <th scope="col">Qué muestran los datos</th>
                  <th scope="col">Magnitud</th>
                  <th scope="col">Segmento y periodo</th>
                  <th scope="col">Suficiencia de evidencia</th>
                  <th scope="col">Fuente y limitaciones</th>
                </tr>
              </thead>
              <tbody>
                {analysis.findings.map((finding) => (
                  <tr key={finding.id}>
                    <td>{findingLabels[finding.kind]}</td>
                    <td>
                      <strong>{finding.title}</strong>
                      <p>{finding.observation}</p>
                      <small>Posible implicación: {finding.customerImplication}</small>
                      {finding.hypothesis && <small>Hipótesis: {finding.hypothesis}</small>}
                    </td>
                    <td>{finding.magnitude}</td>
                    <td>{finding.segment}<br />{finding.period}</td>
                    <td>{finding.evidenceSufficiency === "partial" ? "Parcial" : "Insuficiente"}</td>
                    <td>
                      <small>Fuentes: {finding.sourceIds.join(", ")}</small>
                      {finding.limitations.map((limitation) => (
                        <small key={limitation}>{limitation}</small>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {process.env.NODE_ENV !== "production" && analysis.warnings.length > 0 && (
        <ul className="evidence-warnings" aria-label="Advertencias de calidad">
          {analysis.warnings.map((warning, index) => (
            <li key={`${warning.fileName}-${warning.locator}-${warning.code}-${index}`}>
              <strong>{warning.fileName}</strong> · {warning.locator}: {warning.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
