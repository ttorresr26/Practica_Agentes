import type { EvidenceSource, EvidenceValue } from "./types";

const requiredHeaders = [
  "periodo",
  "canal",
  "franja_horaria",
  "tipo_transferencia",
  "transferencias_totales",
  "menor_1_min",
  "1_a_5_min",
  "5_a_15_min",
  "mayor_15_min",
  "mayor_60_min",
  "reclamos_reportados",
  "fallidas_o_reversadas",
] as const;

const timeBucketDefinitions = [
  { key: "under_1", label: "Menos de 1 minuto" },
  { key: "1_to_5", label: "De 1 a 5 minutos" },
  { key: "5_to_15", label: "De 5 a 15 minutos" },
  { key: "15_to_60", label: "De 15 a 60 minutos" },
  { key: "over_60", label: "Más de 60 minutos" },
] as const;

type TimeBucketKey = (typeof timeBucketDefinitions)[number]["key"];
type QuantitativeFindingKind = "fact" | "calculated_data" | "inference" | "hypothesis";

export interface QuantitativeMeasure {
  count: number;
  percentage: number;
  sourceIds: string[];
}

export interface QuantitativeTimeBucket extends QuantitativeMeasure {
  key: TimeBucketKey;
  label: string;
}

export interface QuantitativeSegment {
  key: string;
  label: string;
  totalTransfers: number;
  delayedTransfers: number;
  delayPercentage: number;
  over60Count: number;
  over60Percentage: number;
  complaintCount: number;
  complaintPercentage: number;
  complaintsPer1000: number;
  failureCount: number;
  failurePercentage: number;
  sourceIds: string[];
}

export interface QuantitativeFinding {
  id: string;
  kind: QuantitativeFindingKind;
  title: string;
  observation: string;
  magnitude: string;
  segment: string;
  period: string;
  customerImplication: string;
  hypothesis?: string;
  sourceIds: string[];
  evidenceSufficiency: "partial" | "insufficient";
  limitations: string[];
}

type QuantitativeFindingDraft = Omit<
  QuantitativeFinding,
  "period" | "evidenceSufficiency" | "limitations"
>;

export interface QuantitativeWarning {
  fileName: string;
  locator: string;
  code:
    | "MISSING_HEADER"
    | "INVALID_ROW"
    | "INCONSISTENT_TIME_BUCKETS"
    | "UNRECONCILED_TIME_BUCKETS"
    | "INCIDENT_COUNT_EXCEEDS_TOTAL"
    | "DUPLICATE_ROW"
    | "CONFLICTING_DUPLICATE_DIMENSION";
  message: string;
}

export interface QuantitativePeriodTrend {
  status: "available" | "insufficient";
  direction: "improving" | "worsening" | "stable" | "insufficient";
  percentagePointChange: number | null;
  fromPeriod: string | null;
  toPeriod: string | null;
  sourceIds: string[];
}

export interface QuantitativeAssociation {
  key: "delay_complaints" | "delay_failures";
  label: string;
  sampleSegmentCount: number;
  coefficient: number | null;
  sourceIds: string[];
  interpretation: string;
}

export interface QuantitativeAnalysis {
  status: "valid" | "partial" | "invalid";
  delayDefinition: string;
  recordsReceived: number;
  recordsUsed: number;
  recordsRejected: number;
  totals?: {
    transfers: number;
    timeDistribution: QuantitativeTimeBucket[];
    delays: QuantitativeMeasure;
    over60: QuantitativeMeasure;
    complaints: QuantitativeMeasure;
    complaintsPer1000: number;
    failures: QuantitativeMeasure;
    unreconciledTimeTransfers: number;
  };
  segments: {
    byChannel: QuantitativeSegment[];
    byDaypart: QuantitativeSegment[];
    byPeriod: QuantitativeSegment[];
    byCombined: QuantitativeSegment[];
  };
  periodTrend: QuantitativePeriodTrend;
  associations: QuantitativeAssociation[];
  findings: QuantitativeFinding[];
  warnings: QuantitativeWarning[];
}

interface TransferRecord {
  source: EvidenceSource;
  period: string;
  channel: string;
  daypart: string;
  transferType: string;
  total: number;
  buckets: Record<TimeBucketKey, number>;
  complaints: number;
  failures: number;
}

const delayDefinition = "5 minutos o más (rangos exclusivos; más de 60 es subconjunto de mayor_15_min)";
const daypartOrder = ["Mañana", "Tarde", "Noche"];
const channelOrder = ["App móvil", "Web"];
const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function isDataSheetSource(source: EvidenceSource) {
  return source.sourceType === "xlsx" && source.locator.startsWith("Hoja Datos_transferencias,");
}

function parseCount(value: EvidenceValue | undefined) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function periodLabel(period: string) {
  const [year, month] = period.split("-");
  return `${monthNames[Number(month) - 1]} ${year}`;
}

function emptyResult(recordsReceived: number, warnings: QuantitativeWarning[]): QuantitativeAnalysis {
  return {
    status: "invalid",
    delayDefinition,
    recordsReceived,
    recordsUsed: 0,
    recordsRejected: recordsReceived,
    segments: { byChannel: [], byDaypart: [], byPeriod: [], byCombined: [] },
    periodTrend: {
      status: "insufficient",
      direction: "insufficient",
      percentagePointChange: null,
      fromPeriod: null,
      toPeriod: null,
      sourceIds: [],
    },
    associations: [],
    findings: [],
    warnings,
  };
}

function combineSourceIds(records: TransferRecord[]) {
  return [...new Set(records.map(({ source }) => source.id))];
}

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function canonicalRow(source: EvidenceSource) {
  return JSON.stringify(
    Object.entries(source.values ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function calculatePeriodTrend(byPeriod: QuantitativeSegment[]): QuantitativePeriodTrend {
  const ordered = [...byPeriod].sort((left, right) => left.key.localeCompare(right.key));
  if (ordered.length < 2) {
    return {
      status: "insufficient",
      direction: "insufficient",
      percentagePointChange: null,
      fromPeriod: null,
      toPeriod: null,
      sourceIds: [...new Set(ordered.flatMap((segment) => segment.sourceIds))],
    };
  }

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const percentagePointChange = last.delayPercentage - first.delayPercentage;
  const direction = Math.abs(percentagePointChange) < 1e-12
    ? "stable"
    : percentagePointChange < 0
      ? "improving"
      : "worsening";

  return {
    status: "available",
    direction,
    percentagePointChange,
    fromPeriod: first.key,
    toPeriod: last.key,
    sourceIds: [...new Set([...first.sourceIds, ...last.sourceIds])],
  };
}

function calculateWeightedCoefficient(
  segments: QuantitativeSegment[],
  outcome: (segment: QuantitativeSegment) => number,
) {
  if (segments.length < 3) return null;

  const totalWeight = segments.reduce((sum, segment) => sum + segment.totalTransfers, 0);
  const meanDelay = segments.reduce(
    (sum, segment) => sum + segment.delayPercentage * segment.totalTransfers,
    0,
  ) / totalWeight;
  const meanOutcome = segments.reduce(
    (sum, segment) => sum + outcome(segment) * segment.totalTransfers,
    0,
  ) / totalWeight;
  const covariance = segments.reduce((sum, segment) =>
    sum + segment.totalTransfers
      * (segment.delayPercentage - meanDelay)
      * (outcome(segment) - meanOutcome), 0);
  const delayVariance = segments.reduce((sum, segment) =>
    sum + segment.totalTransfers * (segment.delayPercentage - meanDelay) ** 2, 0);
  const outcomeVariance = segments.reduce((sum, segment) =>
    sum + segment.totalTransfers * (outcome(segment) - meanOutcome) ** 2, 0);
  if (delayVariance === 0 || outcomeVariance === 0) return null;

  return covariance / Math.sqrt(delayVariance * outcomeVariance);
}

function calculateAssociations(segments: QuantitativeSegment[]): QuantitativeAssociation[] {
  const sourceIds = [...new Set(segments.flatMap((segment) => segment.sourceIds))];
  return [
    {
      key: "delay_complaints",
      label: "Demoras y tasa de reclamos",
      sampleSegmentCount: segments.length,
      coefficient: calculateWeightedCoefficient(segments, (segment) => segment.complaintsPer1000),
      sourceIds,
      interpretation: "Asociación ponderada descriptiva entre segmentos; no demuestra causalidad.",
    },
    {
      key: "delay_failures",
      label: "Demoras y tasa de fallidas o reversadas",
      sampleSegmentCount: segments.length,
      coefficient: calculateWeightedCoefficient(segments, (segment) => segment.failurePercentage),
      sourceIds,
      interpretation: "Asociación ponderada descriptiva entre segmentos; no demuestra causalidad.",
    },
  ];
}

function addFindingMetadata(
  findings: QuantitativeFindingDraft[],
  records: TransferRecord[],
  warnings: QuantitativeWarning[],
): QuantitativeFinding[] {
  return findings.map((finding) => {
    const periods = [...new Set(
      records
        .filter((record) => finding.sourceIds.includes(record.source.id))
        .map((record) => record.period),
    )].sort();
    const limitations = [
      "Los datos son agregados y sintéticos; no describen experiencias individuales.",
      "Las diferencias y asociaciones son descriptivas y no demuestran causalidad.",
    ];
    if (warnings.some((warning) =>
      warning.code === "INCONSISTENT_TIME_BUCKETS" || warning.code === "UNRECONCILED_TIME_BUCKETS",
    )) {
      limitations.push("Los rangos de tiempo no concilian completamente con el total declarado.");
    }

    return {
      ...finding,
      period: periods.length === 0
        ? "Periodo no identificado"
        : periods.length === 1
          ? periodLabel(periods[0])
          : `${periodLabel(periods[0])} – ${periodLabel(periods[periods.length - 1])}`,
      evidenceSufficiency: "partial" as const,
      limitations,
    };
  });
}

function createSegment(
  key: string,
  label: string,
  records: TransferRecord[],
): QuantitativeSegment {
  const totalTransfers = records.reduce((sum, record) => sum + record.total, 0);
  const delayedTransfers = records.reduce(
    (sum, record) => sum + record.buckets["5_to_15"] + record.buckets["15_to_60"] + record.buckets.over_60,
    0,
  );
  const over60Count = records.reduce((sum, record) => sum + record.buckets.over_60, 0);
  const complaintCount = records.reduce((sum, record) => sum + record.complaints, 0);
  const failureCount = records.reduce((sum, record) => sum + record.failures, 0);

  return {
    key,
    label,
    totalTransfers,
    delayedTransfers,
    delayPercentage: (delayedTransfers / totalTransfers) * 100,
    over60Count,
    over60Percentage: (over60Count / totalTransfers) * 100,
    complaintCount,
    complaintPercentage: (complaintCount / totalTransfers) * 100,
    complaintsPer1000: (complaintCount / totalTransfers) * 1000,
    failureCount,
    failurePercentage: (failureCount / totalTransfers) * 100,
    sourceIds: combineSourceIds(records),
  };
}

function buildFindings(
  records: TransferRecord[],
  transfers: number,
  delayCount: number,
  delayPercentage: number,
  byChannel: QuantitativeSegment[],
  byDaypart: QuantitativeSegment[],
  byPeriod: QuantitativeSegment[],
  byCombined: QuantitativeSegment[],
) {
  const allSourceIds = combineSourceIds(records);
  const highestChannel = [...byChannel].sort((a, b) => b.delayPercentage - a.delayPercentage)[0];
  const otherChannel = byChannel.find((segment) => segment.key !== highestChannel?.key);
  const highestDaypart = [...byDaypart].sort((a, b) => b.delayPercentage - a.delayPercentage)[0];
  const highestPeriod = [...byPeriod].sort((a, b) => b.delayPercentage - a.delayPercentage)[0];
  const complaintCount = records.reduce((sum, record) => sum + record.complaints, 0);
  const failureCount = records.reduce((sum, record) => sum + record.failures, 0);
  const highestComplaint = [...byCombined].sort((a, b) => b.complaintPercentage - a.complaintPercentage)[0];
  const highestFailure = [...byCombined].sort((a, b) => b.failurePercentage - a.failurePercentage)[0];
  const lateAfternoon = byCombined.find(
    (segment) => segment.label.includes("App móvil · Tarde"),
  );

  const findings: QuantitativeFindingDraft[] = [
    {
      id: "QF-1",
      kind: "fact",
      title: "Cobertura del conjunto",
      observation: `${records.length} registros válidos representan ${transfers.toLocaleString("es-EC")} transferencias.`,
      magnitude: `${records.length} registros; ${transfers.toLocaleString("es-EC")} transferencias`,
      segment: "Total del conjunto analizado",
      customerImplication: "Los agregados describen volúmenes del conjunto, no experiencias individuales.",
      sourceIds: allSourceIds,
    },
    {
      id: "QF-2",
      kind: "calculated_data",
      title: "Transferencias de 5 minutos o más",
      observation: `${delayCount.toLocaleString("es-EC")} de ${transfers.toLocaleString("es-EC")} transferencias tardaron 5 minutos o más.`,
      magnitude: `${formatPercentage(delayPercentage)}% (${delayCount.toLocaleString("es-EC")} de ${transfers.toLocaleString("es-EC")})`,
      segment: "Todos los registros válidos",
      customerImplication: "El indicador cuantifica espera en los registros, pero no mide satisfacción ni impacto individual.",
      sourceIds: allSourceIds,
    },
  ];

  if (highestChannel && otherChannel) {
    findings.push({
      id: "QF-3",
      kind: "calculated_data",
      title: "Diferencia por canal",
      observation: `${highestChannel.label} registra una proporción de demoras mayor que ${otherChannel.label}.`,
      magnitude: `${formatPercentage(highestChannel.delayPercentage)}% frente a ${formatPercentage(otherChannel.delayPercentage)}%`,
      segment: highestChannel.label,
      customerImplication: "La diferencia puede orientar dónde observar el recorrido, sin demostrar que el canal cause la demora.",
      sourceIds: [...new Set([...highestChannel.sourceIds, ...otherChannel.sourceIds])],
    });
  }

  if (highestDaypart) {
    findings.push({
      id: "QF-4",
      kind: "calculated_data",
      title: "Franja con mayor proporción de demoras",
      observation: `${highestDaypart.label} presenta la mayor proporción ponderada de transferencias de 5 minutos o más.`,
      magnitude: `${formatPercentage(highestDaypart.delayPercentage)}%`,
      segment: highestDaypart.label,
      customerImplication: "La franja puede ayudar a delimitar una investigación de tiempos de espera.",
      sourceIds: highestDaypart.sourceIds,
    });
  }

  if (highestPeriod) {
    const otherPeriod = byPeriod.find((segment) => segment.key !== highestPeriod.key);
    const difference = otherPeriod
      ? highestPeriod.delayPercentage - otherPeriod.delayPercentage
      : 0;
    findings.push({
      id: "QF-5",
      kind: "calculated_data",
      title: "Comparación por periodo",
      observation: otherPeriod
        ? `${highestPeriod.label} tiene la mayor tasa observada; la diferencia frente a ${otherPeriod.label} es de ${formatPercentage(Math.abs(difference))} puntos porcentuales.`
        : `${highestPeriod.label} concentra los registros disponibles.`,
      magnitude: `${formatPercentage(highestPeriod.delayPercentage)}%`,
      segment: highestPeriod.label,
      customerImplication: "La diferencia es descriptiva y no permite concluir una tendencia sin más periodos comparables.",
      sourceIds: [...new Set([...highestPeriod.sourceIds, ...(otherPeriod?.sourceIds ?? [])])],
    });
  }

  if (highestComplaint) {
    findings.push({
      id: "QF-6",
      kind: "calculated_data",
      title: "Mayor incidencia de reclamos",
      observation: `${highestComplaint.complaintCount} reclamos se registran en ${highestComplaint.label}.`,
      magnitude: `${formatPercentage(highestComplaint.complaintPercentage)}% (${highestComplaint.complaintCount} de ${highestComplaint.totalTransfers})`,
      segment: highestComplaint.label,
      customerImplication: "Este segmento concentra la mayor proporción de reclamos reportados por transferencia.",
      sourceIds: highestComplaint.sourceIds,
    });
  }

  if (highestFailure) {
    findings.push({
      id: "QF-7",
      kind: "calculated_data",
      title: "Mayor incidencia de fallidas o reversadas",
      observation: `${highestFailure.failureCount} transferencias fallidas o reversadas se registran en ${highestFailure.label}.`,
      magnitude: `${formatPercentage(highestFailure.failurePercentage)}% (${highestFailure.failureCount} de ${highestFailure.totalTransfers})`,
      segment: highestFailure.label,
      customerImplication: "Este segmento concentra la mayor proporción de fallidas o reversadas reportadas.",
      sourceIds: highestFailure.sourceIds,
    });
  }

  findings.push(
    {
      id: "QF-10",
      kind: "calculated_data",
      title: "Tasa general de reclamos",
      observation: `Se reportaron ${complaintCount.toLocaleString("es-EC")} reclamos para ${transfers.toLocaleString("es-EC")} transferencias.`,
      magnitude: `${formatPercentage((complaintCount / transfers) * 100)}% (${complaintCount.toLocaleString("es-EC")} de ${transfers.toLocaleString("es-EC")})`,
      segment: "Todos los registros válidos",
      customerImplication: "El conteo es agregado y no indica cuántas personas distintas reportaron un problema.",
      sourceIds: allSourceIds,
    },
    {
      id: "QF-11",
      kind: "calculated_data",
      title: "Tasa general de fallidas o reversadas",
      observation: `Se registraron ${failureCount.toLocaleString("es-EC")} transferencias fallidas o reversadas de ${transfers.toLocaleString("es-EC")}.`,
      magnitude: `${formatPercentage((failureCount / transfers) * 100)}% (${failureCount.toLocaleString("es-EC")} de ${transfers.toLocaleString("es-EC")})`,
      segment: "Todos los registros válidos",
      customerImplication: "El agregado no confirma el motivo de la falla ni su efecto individual.",
      sourceIds: allSourceIds,
    },
  );

  if (highestChannel && highestDaypart) {
    const target = lateAfternoon && lateAfternoon.delayPercentage >= highestDaypart.delayPercentage
      ? lateAfternoon
      : undefined;
    findings.push({
      id: "QF-8",
      kind: "inference",
      title: "Implicación potencial para el cliente",
      observation: `La concentración observada en ${target?.label ?? `${highestChannel.label} y ${highestDaypart.label}`} podría corresponder a una espera más frecuente en ese contexto.`,
      magnitude: target ? `${formatPercentage(target.delayPercentage)}% de demoras` : "Patrón descriptivo",
      segment: target?.label ?? `${highestChannel.label} · ${highestDaypart.label}`,
      customerImplication: "Los agregados no indican cuánto esperó una persona ni cómo percibió la transferencia.",
      sourceIds: target?.sourceIds ?? [...new Set([...highestChannel.sourceIds, ...highestDaypart.sourceIds])],
    });
    findings.push({
      id: "QF-9",
      kind: "hypothesis",
      title: "Hipótesis por investigar",
      observation: `Validar si las transferencias de ${target?.label ?? `${highestChannel.label} en ${highestDaypart.label}`} enfrentan una condición operativa distinta.`,
      magnitude: target ? `${formatPercentage(target.delayPercentage)}% de demoras observadas` : "Segmento señalado por los agregados",
      segment: target?.label ?? `${highestChannel.label} · ${highestDaypart.label}`,
      customerImplication: "Observar el recorrido y contrastarlo con evidencia sintética o pública antes de proponer una solución.",
      hypothesis: "La combinación de canal y franja podría asociarse con esperas; el conjunto no establece causalidad.",
      sourceIds: target?.sourceIds ?? [...new Set([...highestChannel.sourceIds, ...highestDaypart.sourceIds])],
    });
  }

  return findings;
}

export function calculateTransferMetrics(sources: EvidenceSource[]): QuantitativeAnalysis {
  const dataSources = sources.filter(isDataSheetSource);
  const rowSources = dataSources.filter((source) =>
    /^Hoja Datos_transferencias, fila \d+$/.test(source.locator),
  );
  const headerSources = dataSources.filter((source) =>
    /^Hoja Datos_transferencias, encabezados, fila \d+$/.test(source.locator),
  );
  const warnings: QuantitativeWarning[] = [];
  const headerByFile = new Map(headerSources.map((source) => [source.fileName, source]));

  if (dataSources.length === 0) {
    return emptyResult(0, [{
      fileName: "Archivo XLSX",
      locator: "Hoja Datos_transferencias",
      code: "MISSING_HEADER",
      message: "No se encontró la hoja Datos_transferencias para calcular métricas.",
    }]);
  }

  const validHeaderFiles = new Set<string>();
  for (const [fileName, headerSource] of headerByFile) {
    const missingHeaders = requiredHeaders.filter(
      (header) => !headerSource.headers?.includes(header),
    );
    if (missingHeaders.length > 0) {
      warnings.push({
        fileName,
        locator: headerSource.locator,
        code: "MISSING_HEADER",
        message: `Faltan encabezados requeridos: ${missingHeaders.join(", ")}.`,
      });
    } else {
      validHeaderFiles.add(fileName);
    }
  }

  for (const fileName of new Set(rowSources.map((source) => source.fileName))) {
    if (!headerByFile.has(fileName)) {
      warnings.push({
        fileName,
        locator: "Hoja Datos_transferencias",
        code: "MISSING_HEADER",
        message: "No se encontró una fila de encabezados válida para esta hoja.",
      });
    }
  }

  const parsedRecords: TransferRecord[] = [];
  for (const source of rowSources) {
    if (!validHeaderFiles.has(source.fileName)) continue;
    const values = source.values;
    const period = values?.periodo;
    const channel = values?.canal;
    const daypart = values?.franja_horaria;
    const counts = Object.fromEntries(
      requiredHeaders
        .filter((header) =>
          !["periodo", "canal", "franja_horaria", "tipo_transferencia"].includes(header),
        )
        .map((header) => [header, parseCount(values?.[header])]),
    ) as Record<(typeof requiredHeaders)[number], number | null>;

    const periodValue = typeof period === "string" ? period.trim() : "";
    const channelValue = typeof channel === "string" ? channel.trim() : "";
    const daypartValue = typeof daypart === "string" ? daypart.trim() : "";
    const transferType = typeof values?.tipo_transferencia === "string"
      ? values.tipo_transferencia.trim()
      : "";
    const invalidFields = [
      ...(!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodValue) ? ["periodo (se esperaba el formato AAAA-MM)"] : []),
      ...(!channelOrder.includes(channelValue) ? ["canal (se esperaba App móvil o Web)"] : []),
      ...(!daypartOrder.includes(daypartValue) ? ["franja_horaria (se esperaba Mañana, Tarde o Noche)"] : []),
      ...(!transferType ? ["tipo_transferencia (debe contener un valor de texto)"] : []),
      ...Object.entries(counts)
        .filter(([, value]) => value === null)
        .map(([field]) => `${field} (debe ser un entero no negativo)`),
    ];

    if (invalidFields.length > 0) {
      warnings.push({
        fileName: source.fileName,
        locator: source.locator,
        code: "INVALID_ROW",
        message: `Registro omitido por valores faltantes o inválidos: ${invalidFields.join(", ")}.`,
      });
      continue;
    }

    const total = counts.transferencias_totales!;
    const nestedOver60 = counts.mayor_60_min!;
    const inclusiveOver15 = counts.mayor_15_min!;
    if (nestedOver60 > inclusiveOver15) {
      warnings.push({
        fileName: source.fileName,
        locator: source.locator,
        code: "INCONSISTENT_TIME_BUCKETS",
        message: `mayor_60_min (${nestedOver60}) supera mayor_15_min (${inclusiveOver15}); el registro se excluyó por inconsistencia del rango anidado.`,
      });
      continue;
    }

    const timeBucketTotal =
      counts.menor_1_min! +
      counts["1_a_5_min"]! +
      counts["5_a_15_min"]! +
      inclusiveOver15;
    if (total <= 0) {
      warnings.push({
        fileName: source.fileName,
        locator: source.locator,
        code: "INVALID_ROW",
        message: "Registro omitido: transferencias_totales debe ser mayor que cero.",
      });
      continue;
    }
    if (timeBucketTotal !== total) {
      const difference = total - timeBucketTotal;
      const differenceDescription = difference > 0
        ? `faltan ${difference} transferencias por clasificar`
        : `los rangos exceden el total por ${Math.abs(difference)} transferencias`;
      warnings.push({
        fileName: source.fileName,
        locator: source.locator,
        code: "UNRECONCILED_TIME_BUCKETS",
        message: `Los rangos exclusivos suman ${timeBucketTotal}, pero transferencias_totales indica ${total}; ${differenceDescription}. El registro se conserva sin ajustar sus valores.`,
      });
    }

    const complaints = counts.reclamos_reportados!;
    const failures = counts.fallidas_o_reversadas!;
    if (complaints > total || failures > total) {
      warnings.push({
        fileName: source.fileName,
        locator: source.locator,
        code: "INCIDENT_COUNT_EXCEEDS_TOTAL",
        message: "Reclamos o fallidas/reversadas superan el total de transferencias; el registro se excluyó de los cálculos.",
      });
      continue;
    }

    parsedRecords.push({
      source,
      period: periodValue,
      channel: channelValue,
      daypart: daypartValue,
      transferType,
      total,
      buckets: {
        under_1: counts.menor_1_min!,
        "1_to_5": counts["1_a_5_min"]!,
        "5_to_15": counts["5_a_15_min"]!,
        "15_to_60": inclusiveOver15 - nestedOver60,
        over_60: nestedOver60,
      },
      complaints,
      failures,
    });
  }

  const validRecords: TransferRecord[] = [];
  for (const [dimensionKey, records] of groupBy(
    parsedRecords,
    (record) => `${record.period}|${record.channel}|${record.daypart}|${record.transferType}`,
  )) {
    if (records.length === 1) {
      validRecords.push(records[0]);
      continue;
    }

    const fingerprints = new Set(records.map((record) => canonicalRow(record.source)));
    if (fingerprints.size === 1) {
      validRecords.push(records[0]);
      for (const duplicate of records.slice(1)) {
        warnings.push({
          fileName: duplicate.source.fileName,
          locator: duplicate.source.locator,
          code: "DUPLICATE_ROW",
          message: `Fila omitida: es idéntica a otra fila del grupo ${dimensionKey}.`,
        });
      }
      continue;
    }

    for (const conflict of records) {
      warnings.push({
        fileName: conflict.source.fileName,
        locator: conflict.source.locator,
        code: "CONFLICTING_DUPLICATE_DIMENSION",
        message: `Fila omitida: hay valores incompatibles para el mismo periodo, canal, franja y tipo (${dimensionKey}).`,
      });
    }
  }

  if (validRecords.length === 0) {
    return emptyResult(rowSources.length, warnings.length > 0
      ? warnings
      : [{
          fileName: "Archivo XLSX",
          locator: "Hoja Datos_transferencias",
          code: "MISSING_HEADER",
          message: "No se encontraron registros válidos para calcular métricas.",
        }]);
  }

  const transfers = validRecords.reduce((sum, record) => sum + record.total, 0);
  const sourceIds = combineSourceIds(validRecords);
  const timeDistribution = timeBucketDefinitions.map(({ key, label }) => {
    const count = validRecords.reduce((sum, record) => sum + record.buckets[key], 0);
    return { key, label, count, percentage: (count / transfers) * 100, sourceIds };
  });
  const delays = timeDistribution
    .filter((bucket) => ["5_to_15", "15_to_60", "over_60"].includes(bucket.key))
    .reduce((sum, bucket) => sum + bucket.count, 0);
  const over60 = timeDistribution.find((bucket) => bucket.key === "over_60")!;
  const complaints = validRecords.reduce((sum, record) => sum + record.complaints, 0);
  const failures = validRecords.reduce((sum, record) => sum + record.failures, 0);
  const unreconciledTimeTransfers = validRecords.reduce((sum, record) =>
    sum + record.total - Object.values(record.buckets).reduce((bucketSum, count) => bucketSum + count, 0), 0);
  const byChannel = [...groupBy(validRecords, (record) => record.channel)].map(([key, records]) =>
    createSegment(key, key, records),
  ).sort((a, b) => channelOrder.indexOf(a.key) - channelOrder.indexOf(b.key));
  const byDaypart = [...groupBy(validRecords, (record) => record.daypart)].map(([key, records]) =>
    createSegment(key, key, records),
  ).sort((a, b) => daypartOrder.indexOf(a.key) - daypartOrder.indexOf(b.key));
  const byPeriod = [...groupBy(validRecords, (record) => record.period)].map(([key, records]) =>
    createSegment(key, periodLabel(key), records),
  ).sort((a, b) => a.key.localeCompare(b.key));
  const byCombined = [...groupBy(
    validRecords,
    (record) => `${record.period}|${record.channel}|${record.daypart}`,
  )].map(([key, records]) => {
    const [period, channel, daypart] = key.split("|");
    return createSegment(key, `${periodLabel(period)} · ${channel} · ${daypart}`, records);
  }).sort((a, b) => a.key.localeCompare(b.key));
  const delayPercentage = (delays / transfers) * 100;
  const findings = addFindingMetadata(
    buildFindings(
      validRecords,
      transfers,
      delays,
      delayPercentage,
      byChannel,
      byDaypart,
      byPeriod,
      byCombined,
    ),
    validRecords,
    warnings,
  );
  const periodTrend = calculatePeriodTrend(byPeriod);
  const associations = calculateAssociations(byCombined);
  const recordsRejected = rowSources.length - validRecords.length;

  return {
    status: warnings.length === 0 ? "valid" : "partial",
    delayDefinition,
    recordsReceived: rowSources.length,
    recordsUsed: validRecords.length,
    recordsRejected,
    totals: {
      transfers,
      timeDistribution,
      delays: { count: delays, percentage: delayPercentage, sourceIds },
      over60: {
        count: over60.count,
        percentage: over60.percentage,
        sourceIds,
      },
      complaints: {
        count: complaints,
        percentage: (complaints / transfers) * 100,
        sourceIds,
      },
      complaintsPer1000: (complaints / transfers) * 1000,
      failures: {
        count: failures,
        percentage: (failures / transfers) * 100,
        sourceIds,
      },
      unreconciledTimeTransfers,
    },
    segments: { byChannel, byDaypart, byPeriod, byCombined },
    periodTrend,
    associations,
    findings,
    warnings,
  };
}
