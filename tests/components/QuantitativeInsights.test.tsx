// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import QuantitativeInsights from "../../src/components/QuantitativeInsights";
import { calculateTransferMetrics } from "../../src/lib/evidence/calculations";
import { parseUpload } from "../../src/lib/evidence/parse-upload";

describe("QuantitativeInsights", () => {
  it("shows deterministic KPIs, chart comparisons, segment incidence and traceable findings", async () => {
    const fileName = "prueba_sintetica_transferencias_discovery.xlsx";
    const bytes = await readFile(join(process.cwd(), "tests/fixtures/synthetic", fileName));
    const parsed = await parseUpload(
      new File([bytes], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const analysis = calculateTransferMetrics(
      parsed.sources.map((source, index) => ({
        ...source,
        id: `S${String(index + 1).padStart(3, "0")}`,
      })),
    );

    const markup = renderToStaticMarkup(
      <QuantitativeInsights
        analysis={analysis}
        comparison={{
          status: "not_comparable",
          explanation: "La demanda no contiene una afirmación porcentual comparable.",
          sourceIds: [],
        }}
      />,
    );

    expect(markup).toContain("ANÁLISIS DE EVIDENCIA CUANTITATIVA");
    expect(markup).toContain("97.200");
    expect(markup).toContain("9,63%");
    expect(markup).toContain("1,12%");
    expect(markup).toContain("4,91");
    expect(markup).toContain("0,26%");
    expect(markup).toContain("Diferencia no conciliada de 1.089");
    expect(markup).toContain("12 de 12 registros");
    expect(markup).toContain("mayor_60_min se descuenta de mayor_15_min");
    expect(markup).toContain("Mejora");
    expect(markup).toContain("No comparable con la demanda");
    expect(markup).toContain("Distribución de tiempos");
    expect(markup).toContain("Comparativo por canal");
    expect(markup).toContain("Comparativo por franja horaria");
    expect(markup).toContain("Evolución por periodo");
    expect(markup).toContain("Reclamos y transferencias fallidas");
    expect(markup).toContain("Noviembre 2026 · App móvil · Tarde");
    expect(markup).toContain("Fuentes: S");
    expect(markup).toContain("Octubre 2026 – Noviembre 2026");
    expect(markup).toContain("Suficiencia de evidencia");
    expect(markup).toContain("agregados y sintéticos");
    expect(markup).toContain("no demuestran causalidad");
    expect(markup).toContain(fileName);
    expect(markup).toContain(analysis.warnings[0].message);

    vi.stubEnv("NODE_ENV", "production");
    try {
      const productionMarkup = renderToStaticMarkup(
        <QuantitativeInsights
          analysis={analysis}
          comparison={{
            status: "not_comparable",
            explanation: "La demanda no contiene una afirmación porcentual comparable.",
            sourceIds: [],
          }}
        />,
      );

      expect(productionMarkup).not.toContain(fileName);
      expect(productionMarkup).not.toContain(analysis.warnings[0].message);
      expect(productionMarkup).toContain("Diferencia no conciliada de 1.089");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
