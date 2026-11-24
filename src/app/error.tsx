"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main className="error-page">
          <p className="eyebrow">Discovery AI Assistant</p>
          <h1>Algo salió mal</h1>
          <p>Ocurrió un error inesperado. Intenta cargar la pantalla nuevamente.</p>
          <button className="primary-button" onClick={() => reset()}>
            Volver a intentar
          </button>
        </main>
      </body>
    </html>
  );
}
