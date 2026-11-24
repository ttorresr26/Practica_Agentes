# Hide Detailed Warnings in Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide per-file and per-row quantitative warnings from the production UI while preserving aggregate quality notices and API behavior.

**Architecture:** Gate only the detailed warning list in `QuantitativeInsights` on `NODE_ENV`. Keep server calculations, warning payloads, and all aggregate warnings unchanged.

**Tech Stack:** Next.js, React, TypeScript, Vitest.

**Spec:** [2026-11-20-production-warning-visibility-design.md](../specs/2026-11-20-production-warning-visibility-design.md)

## Global Constraints

- En producción, ocultar solo la lista detallada de `analysis.warnings`.
- Mantener los indicadores, hallazgos y avisos agregados de calidad, incluida la diferencia total no conciliada.
- No cambiar los cálculos, las advertencias del servidor ni el contrato/respuesta de la API; los detalles seguirán disponibles en la respuesta de red.
- No cambiar la interfaz fuera de ese bloque ni introducir configuración adicional.

## Review Focus

- Production rendering must omit per-file/per-row warning details while retaining the aggregate unreconciled-count warning; verify both in a component test.
- Non-production rendering must continue showing detailed warnings for troubleshooting; verify in the same component test.

---

### Task 1: Hide Detailed Warning List in Production

**Files:**
- Modify: `src/components/QuantitativeInsights.tsx`
- Test: `tests/components/QuantitativeInsights.test.tsx`

**Interfaces:**
- Consumes: `QuantitativeAnalysis.warnings` and `QuantitativeAnalysis.totals.unreconciledTimeTransfers`.
- Produces: UI behavior gated by `process.env.NODE_ENV`; no API or data contract changes.

- [ ] **Step 1: Add a failing component test**

Add a test rendering the existing synthetic analysis under both environments:
- In development, markup includes the XLSX filename and row-level warning message.
- In production, markup omits the detailed warning filename/message but still includes `Diferencia no conciliada de 1.089`.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- tests/components/QuantitativeInsights.test.tsx`
Expected: FAIL because production markup currently includes detailed warnings.

- [ ] **Step 3: Gate only the detailed warning list**

In `QuantitativeInsights`, render the existing `analysis.warnings` list only when `process.env.NODE_ENV !== "production"`. Leave calculations, API responses, and aggregate notices unchanged.

- [ ] **Step 4: Run focused test, lint, and production build**

Run: `npm test -- tests/components/QuantitativeInsights.test.tsx`
Expected: PASS for development and production rendering assertions.

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: production compilation and type validation PASS.
