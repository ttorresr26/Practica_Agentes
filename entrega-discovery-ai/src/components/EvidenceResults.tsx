import type {
  EvidenceProcessingResponse,
  EvidenceSource,
  EvidenceWarning,
} from "../lib/evidence/types";

function EvidenceSourceCard({ source }: { source: EvidenceSource }) {
  return (
    <article className="evidence-source">
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
  );
}

function WarningList({ warnings }: { warnings: EvidenceWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="evidence-warnings" role="status">
      <h3>Observaciones de lectura</h3>
      <ul>
        {warnings.map((warning, index) => (
          <li key={`${warning.fileName}-${warning.locator}-${index}`}>
            <strong>{warning.fileName}</strong> · {warning.locator}: {warning.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EvidenceResults({
  result,
}: {
  result: EvidenceProcessingResponse;
}) {
  const fileLabel = result.fileCount === 1 ? "archivo" : "archivos";
  const processedItems =
    result.fileCount === 0
      ? "Se procesó la demanda."
      : `Se procesó la demanda junto con ${result.fileCount} ${fileLabel}.`;

  return (
    <section className="evidence-results" aria-labelledby="evidence-results-title">
      <p className="eyebrow">Procesamiento local completado</p>
      <h2 id="evidence-results-title">Contenido extraído</h2>
      <p className="evidence-results-summary">
        {processedItems} Se prepararon {result.sources.length} referencias. No se usó IA ni se guardó la
        información.
      </p>
      <WarningList warnings={result.warnings} />
      <div className="evidence-source-list">
        {result.sources.map((source) => (
          <EvidenceSourceCard key={source.id} source={source} />
        ))}
      </div>
    </section>
  );
}
