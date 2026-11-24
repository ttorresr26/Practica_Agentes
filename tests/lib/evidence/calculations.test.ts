// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateTransferMetrics } from "../../../src/lib/evidence/calculations";
import { parseUpload } from "../../../src/lib/evidence/parse-upload";

const fixtureName = "prueba_sintetica_transferencias_discovery.xlsx";
const fixturePath = join(process.cwd(), "tests/fixtures/synthetic", fixtureName);

async function loadSources() {
  const bytes = await readFile(fixturePath);
  const result = await parseUpload(
    new File([bytes], fixtureName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  return result.sources.map((source, index) => ({
    ...source,
    id: `S${String(index + 1).padStart(3, "0")}`,
  }));
}

function dataRows(sources: Awaited<ReturnType<typeof loadSources>>) {
  return sources.filter((source) => /^Hoja Datos_transferencias, fila \d+$/.test(source.locator));
}

function sourceRate(
  sources: Awaited<ReturnType<typeof loadSources>>,
  predicate: (source: (typeof sources)[number]) => boolean,
  numerator: (source: (typeof sources)[number]) => number,
) {
  const rows = dataRows(sources).filter(predicate);
  const total = rows.reduce((sum, source) => sum + Number(source.values!.transferencias_totales), 0);
  const count = rows.reduce((sum, source) => sum + numerator(source), 0);
  return (count / total) * 100;
}

describe("calculateTransferMetrics", () => {
  it("calculates weighted totals, distributions, segments and traceable findings from the exact workbook", async () => {
    const sources = await loadSources();
    const result = calculateTransferMetrics(sources);

    expect(result).toMatchObject({
      status: "partial",
      recordsReceived: 12,
      recordsUsed: 12,
      recordsRejected: 0,
      totals: {
        transfers: 97200,
        delays: { count: 9361 },
        over60: { count: 1089 },
        complaintsPer1000: expect.closeTo((477 / 97200) * 1000, 8),
        unreconciledTimeTransfers: 1089,
        complaints: { count: 477 },
        failures: { count: 257 },
      },
    });
    expect(result.totals?.delays.percentage).toBeCloseTo((9361 / 97200) * 100, 8);
    expect(result.totals?.over60.percentage).toBeCloseTo((1089 / 97200) * 100, 8);
    expect(result.totals?.complaintsPer1000).toBeCloseTo((477 / 97200) * 1000, 8);
    expect(result.totals?.complaints.percentage).toBeCloseTo((477 / 97200) * 100, 8);
    expect(result.totals?.failures.percentage).toBeCloseTo((257 / 97200) * 100, 8);
    expect(result.totals?.timeDistribution).toMatchObject([
      { key: "under_1", count: 69460 },
      { key: "1_to_5", count: 17290 },
      { key: "5_to_15", count: 6726 },
      { key: "15_to_60", count: 1546 },
      { key: "over_60", count: 1089 },
    ]);
    const timeBucketCounts = [69460, 17290, 6726, 1546, 1089];
    result.totals!.timeDistribution.forEach((bucket, index) => {
      expect(bucket.percentage).toBeCloseTo((timeBucketCounts[index] / 97200) * 100, 8);
    });
    expect(result.totals?.timeDistribution.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(96111);
    expect(result.warnings.filter((warning) => warning.code === "UNRECONCILED_TIME_BUCKETS")).toHaveLength(12);
    expect(result.warnings.filter((warning) =>
      ["DUPLICATE_ROW", "CONFLICTING_DUPLICATE_DIMENSION"].includes(warning.code),
    )).toHaveLength(0);

    const app = result.segments.byChannel.find((segment) => segment.label === "App móvil");
    const web = result.segments.byChannel.find((segment) => segment.label === "Web");
    const afternoon = result.segments.byDaypart.find((segment) => segment.label === "Tarde");
    const october = result.segments.byPeriod.find((segment) => segment.label === "Octubre 2026");
    const november = result.segments.byPeriod.find((segment) => segment.label === "Noviembre 2026");
    const highestComplaintSegment = result.segments.byCombined.find(
      (segment) => segment.label === "Noviembre 2026 · App móvil · Tarde",
    );

    expect(app?.delayPercentage).toBeCloseTo(sourceRate(
      sources,
      (source) => source.values?.canal === "App móvil",
      (source) => Number(source.values?.["5_a_15_min"]) + Number(source.values?.mayor_15_min),
    ), 8);
    expect(web?.delayPercentage).toBeCloseTo(sourceRate(
      sources,
      (source) => source.values?.canal === "Web",
      (source) => Number(source.values?.["5_a_15_min"]) + Number(source.values?.mayor_15_min),
    ), 8);
    expect(afternoon?.delayPercentage).toBeCloseTo(sourceRate(
      sources,
      (source) => source.values?.franja_horaria === "Tarde",
      (source) => Number(source.values?.["5_a_15_min"]) + Number(source.values?.mayor_15_min),
    ), 8);
    expect(october?.delayPercentage).toBeCloseTo(sourceRate(
      sources,
      (source) => source.values?.periodo === "2026-10",
      (source) => Number(source.values?.["5_a_15_min"]) + Number(source.values?.mayor_15_min),
    ), 8);
    expect(november?.delayPercentage).toBeCloseTo(sourceRate(
      sources,
      (source) => source.values?.periodo === "2026-11",
      (source) => Number(source.values?.["5_a_15_min"]) + Number(source.values?.mayor_15_min),
    ), 8);
    expect(highestComplaintSegment).toMatchObject({
      complaintCount: 128,
      failureCount: 65,
    });
    expect(highestComplaintSegment?.complaintPercentage).toBeCloseTo((128 / 15100) * 100, 8);
    expect(highestComplaintSegment?.failurePercentage).toBeCloseTo((65 / 15100) * 100, 8);
    expect(
      [...result.segments.byCombined].sort((a, b) => b.complaintPercentage - a.complaintPercentage)[0].label,
    ).toBe("Noviembre 2026 · App móvil · Tarde");
    expect(
      [...result.segments.byCombined].sort((a, b) => b.failurePercentage - a.failurePercentage)[0].label,
    ).toBe("Noviembre 2026 · App móvil · Tarde");
    expect(result.periodTrend.percentagePointChange).toBeCloseTo(
      november!.delayPercentage - october!.delayPercentage,
      8,
    );
    expect(result.periodTrend).toMatchObject({
      status: "available",
      direction: "improving",
      fromPeriod: "2026-10",
      toPeriod: "2026-11",
    });
    expect(result.periodTrend.percentagePointChange).toBeCloseTo(
      november!.delayPercentage - october!.delayPercentage,
      8,
    );
    expect(result.associations).toHaveLength(2);
    expect(result.associations.every((association) =>
      association.interpretation.toLowerCase().includes("no demuestra causalidad"),
    )).toBe(true);
    expect(result.findings.every((finding) =>
      finding.period && finding.evidenceSufficiency === "partial" && finding.limitations.length > 0,
    )).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "UNRECONCILED_TIME_BUCKETS")).toBe(true);
    expect(result.findings.some((finding) => finding.kind === "inference")).toBe(true);
    expect(result.findings.some((finding) => finding.kind === "hypothesis")).toBe(true);
    const appRows = dataRows(sources).filter((source) => source.values?.canal === "App móvil");
    const appSimpleAverageComplaintsPer1000 = appRows.reduce((sum, source) =>
      sum + (Number(source.values?.reclamos_reportados) / Number(source.values?.transferencias_totales)) * 1000,
    0) / appRows.length;
    expect(app?.complaintsPer1000).toBeCloseTo((app!.complaintCount / app!.totalTransfers) * 1000, 8);
    expect(app?.complaintsPer1000).not.toBeCloseTo(appSimpleAverageComplaintsPer1000, 5);
    expect(
      result.findings.flatMap((finding) => finding.sourceIds).some((sourceId) => {
        const source = sources.find((item) => item.id === sourceId);
        return source?.locator.startsWith("Hoja LEEME");
      }),
    ).toBe(false);
  });

  it("counts exact duplicate rows once and traces the duplicate warning", async () => {
    const sources = await loadSources();
    const duplicate = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    )!;
    const repeated = {
      ...duplicate,
      id: "S999",
      locator: "Hoja Datos_transferencias, fila 14",
      values: { ...duplicate.values },
    };

    const result = calculateTransferMetrics([...sources, repeated]);

    expect(result.recordsReceived).toBe(13);
    expect(result.recordsUsed).toBe(12);
    expect(result.recordsRejected).toBe(1);
    expect(result.totals?.transfers).toBe(97200);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_ROW",
        locator: "Hoja Datos_transferencias, fila 14",
      }),
    );
  });

  it("excludes every conflicting row in a repeated dimension group", async () => {
    const sources = await loadSources();
    const original = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    )!;
    const conflict = {
      ...original,
      id: "S999",
      locator: "Hoja Datos_transferencias, fila 14",
      values: { ...original.values, transferencias_totales: 12001 },
    };

    const result = calculateTransferMetrics([...sources, conflict]);

    expect(result.recordsReceived).toBe(13);
    expect(result.recordsUsed).toBe(11);
    expect(result.recordsRejected).toBe(2);
    expect(result.totals?.transfers).toBe(85200);
    expect(result.warnings.filter((warning) =>
      warning.code === "CONFLICTING_DUPLICATE_DIMENSION",
    )).toEqual(expect.arrayContaining([
      expect.objectContaining({ locator: original.locator }),
      expect.objectContaining({ locator: conflict.locator }),
    ]));
  });

  it("does not produce a period trend when only one comparable period remains", async () => {
    const sources = await loadSources();
    const onePeriod = sources.filter((source) =>
      !/^Hoja Datos_transferencias, fila \d+$/.test(source.locator)
      || source.values?.periodo === "2026-11",
    );

    const result = calculateTransferMetrics(onePeriod);

    expect(result.periodTrend).toMatchObject({
      status: "insufficient",
      direction: "insufficient",
      percentagePointChange: null,
    });
  });

  it("rejects a row whose over-60 count exceeds the inclusive over-15 count", async () => {
    const sources = await loadSources();
    const row = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    )!;
    row.values!.mayor_60_min = 999999;

    const result = calculateTransferMetrics(sources);

    expect(result.recordsUsed).toBe(11);
    expect(result.recordsRejected).toBe(1);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "INCONSISTENT_TIME_BUCKETS",
        locator: row.locator,
        message: expect.stringContaining("supera mayor_15_min"),
      }),
    );
  });

  it("omits a row when incident counts exceed its declared transfer total", async () => {
    const sources = await loadSources();
    const row = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    )!;
    row.values!.reclamos_reportados = Number(row.values!.transferencias_totales) + 1;
    const expectedComplaints = dataRows(sources)
      .filter((source) => source !== row)
      .reduce((sum, source) => sum + Number(source.values!.reclamos_reportados), 0);

    const result = calculateTransferMetrics(sources);

    expect(result.recordsUsed).toBe(11);
    expect(result.recordsRejected).toBe(1);
    expect(result.totals?.complaints.count).toBe(expectedComplaints);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "INCIDENT_COUNT_EXCEEDS_TOTAL",
        locator: row.locator,
      }),
    );
  });

  it("omits a row when failed transfers exceed its declared transfer total", async () => {
    const sources = await loadSources();
    const row = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    )!;
    row.values!.fallidas_o_reversadas = Number(row.values!.transferencias_totales) + 1;
    const expectedFailures = dataRows(sources)
      .filter((source) => source !== row)
      .reduce((sum, source) => sum + Number(source.values!.fallidas_o_reversadas), 0);

    const result = calculateTransferMetrics(sources);

    expect(result.recordsUsed).toBe(11);
    expect(result.recordsRejected).toBe(1);
    expect(result.totals?.failures.count).toBe(expectedFailures);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "INCIDENT_COUNT_EXCEEDS_TOTAL",
        locator: row.locator,
      }),
    );
  });

  it.each([null, 17])("rejects rows with a missing or non-text transfer type (%s)", async (typeValue) => {
    const sources = await loadSources();
    const row = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    )!;
    row.values!.tipo_transferencia = typeValue;

    const result = calculateTransferMetrics(sources);

    expect(result.recordsUsed).toBe(11);
    expect(result.recordsRejected).toBe(1);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "INVALID_ROW",
        locator: row.locator,
        message: expect.stringContaining("tipo_transferencia"),
      }),
    );
  });

  it("requires the transfer-type header", async () => {
    const sources = await loadSources();
    const header = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, encabezados, fila 1",
    )!;
    header.headers = header.headers?.filter((name) => name !== "tipo_transferencia");

    const result = calculateTransferMetrics(sources);

    expect(result.status).toBe("invalid");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "MISSING_HEADER",
        message: expect.stringContaining("tipo_transferencia"),
      }),
    );
  });

  it("returns null coefficients when fewer than three combined segments are available", async () => {
    const sources = await loadSources();
    const row = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    )!;
    const oneSegment = sources.filter((source) =>
      !/^Hoja Datos_transferencias, fila \d+$/.test(source.locator)
      || source === row,
    );

    const result = calculateTransferMetrics(oneSegment);

    expect(result.associations).toHaveLength(2);
    expect(result.associations.every((association) =>
      association.sampleSegmentCount === 1 && association.coefficient === null,
    )).toBe(true);
  });

  it("excludes missing and inconsistent records and reports each validation issue", async () => {
    const sources = await loadSources();
    const rows = dataRows(sources).slice(0, 2);
    rows[0].values!.reclamos_reportados = null;
    rows[1].values!.menor_1_min = 0;

    const result = calculateTransferMetrics([...sources]);

    expect(result.status).toBe("partial");
    expect(result.recordsReceived).toBe(12);
    expect(result.recordsUsed).toBe(11);
    expect(result.recordsRejected).toBe(1);
    expect(result.totals?.transfers).toBe(85200);
    expect(result.warnings.filter((warning) => warning.code === "INVALID_ROW")).toHaveLength(1);
    expect(result.warnings.filter((warning) => warning.code === "UNRECONCILED_TIME_BUCKETS")).toHaveLength(11);
  });

  it("reports missing required headers without producing rates", async () => {
    const sources = await loadSources();
    const withoutHeader = sources.filter(
      (source) => source.locator !== "Hoja Datos_transferencias, encabezados, fila 1",
    );

    const result = calculateTransferMetrics(withoutHeader);

    expect(result.status).toBe("invalid");
    expect(result.totals).toBeUndefined();
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "MISSING_HEADER" }),
    );
  });

  it("rejects non-numeric counts and unsupported segment values", async () => {
    const sources = await loadSources();
    const row = sources.find(
      (source) => source.locator === "Hoja Datos_transferencias, fila 2",
    );
    row!.values!.transferencias_totales = "12,000";
    row!.values!.canal = "Móvil";
    row!.values!.periodo = "2026-13";

    const result = calculateTransferMetrics(sources);

    expect(result.status).toBe("partial");
    expect(result.recordsUsed).toBe(11);
    expect(result.recordsRejected).toBe(1);
    expect(result.warnings[0]).toMatchObject({
      code: "INVALID_ROW",
      locator: "Hoja Datos_transferencias, fila 2",
      message: expect.stringContaining("periodo"),
    });
  });
});
