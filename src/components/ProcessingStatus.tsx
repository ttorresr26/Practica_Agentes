export type ProcessingStage = "structure" | "evidence" | "advice";

const stages: { id: ProcessingStage; label: string }[] = [
  { id: "structure", label: "Estructurando la demanda" },
  { id: "evidence", label: "Analizando el problema y la evidencia" },
  { id: "advice", label: "Preparando oportunidades y recomendación" },
];

export default function ProcessingStatus({
  stage,
  completedStages = [],
}: {
  stage: ProcessingStage;
  completedStages?: ProcessingStage[];
}) {
  const activeIndex = stages.findIndex((item) => item.id === stage);
  const activeStage = stages[activeIndex];

  return (
    <section
      className="processing-status"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Progreso del análisis"
    >
      <div className="processing-heading">
        <span className="loading-indicator" aria-hidden="true" />
        <div>
          <h2>Analizando la demanda</h2>
          <p>{activeStage.label}</p>
        </div>
      </div>
      <ol className="processing-steps">
        {stages.map((item, index) => (
          <li
            key={item.id}
            aria-label={item.label}
            aria-current={index === activeIndex ? "step" : undefined}
            data-complete={completedStages.includes(item.id) ? "true" : undefined}
          >
            <span className="processing-step-marker" aria-hidden="true">
              {completedStages.includes(item.id) ? "✓" : index + 1}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
