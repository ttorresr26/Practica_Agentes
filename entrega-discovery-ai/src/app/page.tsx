import Link from "next/link";
import DemandForm from "../components/DemandForm";

export default function Home() {
  const mockMode = (process.env.AI_PROVIDER?.trim().toLowerCase() || "mock") === "mock";
  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Discovery AI Assistant, inicio">
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
          <span>Discovery AI Assistant</span>
        </Link>
        <span className="prototype-label">Prototipo</span>
        {mockMode && (
          <span className="prototype-label" role="status">
            Modo de prueba: IA simulada
          </span>
        )}
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Descubrimiento de producto</p>
        <h1 id="page-title">De una demanda a una mejor oportunidad.</h1>
        <p className="intro-copy">
          El asistente analizará la demanda para identificar el posible problema del
          cliente, organizar la evidencia disponible y recomendar el siguiente paso.
        </p>
      </section>

      <section className="entry-card" aria-labelledby="demand-title">
        <div className="card-heading">
          <div className="step-marker" aria-hidden="true">
            1
          </div>
          <div>
            <p className="eyebrow">Punto de partida</p>
            <h2 id="demand-title">¿Qué demanda quieres explorar?</h2>
          </div>
        </div>
        <p className="card-copy">
          Pega o describe el requerimiento, incidente o necesidad tal como lo
          recibiste. No hace falta completar un cuestionario.
        </p>
        <DemandForm />
      </section>

      <aside className="safety-note" aria-label="Aviso sobre la información">
        <span className="safety-icon" aria-hidden="true">
          i
        </span>
        <p>
          Este prototipo es para información <strong>ficticia, sintética, agregada o
          pública</strong>. No introduzcas datos reales de clientes ni información
          confidencial de Banco Pichincha.
          <span className="safety-limitation">
            {" "}La detección local de patrones sensibles es limitada y no puede garantizar que un archivo esté anonimizado.
          </span>
        </p>
      </aside>

      <footer className="page-footer">
        <span>Una herramienta de apoyo; la decisión final siempre es tuya.</span>
        <span className="footer-status">
          <span aria-hidden="true" />
          Cálculos cuantitativos locales disponibles
        </span>
      </footer>
    </main>
  );
}
