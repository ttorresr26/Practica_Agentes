# Quantitative Layout and Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep quantitative evidence charts within their cards across screen sizes and explain the synthetic workbook's real range discrepancy without altering its values.

**Architecture:** Retain the existing four-cell bar row and make its CSS grid adaptive, with explicit metric alignment and a stacked small-screen layout. Keep the existing exclusive-range arithmetic and denominators; classify row-level reconciliation warnings separately and surface their origin in the aggregate notice.

**Tech Stack:** Next.js, React, TypeScript, global CSS, Zod, Vitest.

**Spec:** [2026-11-20-quantitative-layout-reconciliation-design.md](../specs/2026-11-20-quantitative-layout-reconciliation-design.md)

## Global Constraints

- Adapt the four existing columns with `minmax(0, ...)`, right-align percentages/quantities, wrap text, and stack on narrow screens.
- Distinguish a row whose ranges do not reconcile (`UNRECONCILED_TIME_BUCKETS`) from a violation of the nested range (`INCONSISTENT_TIME_BUCKETS`).
- Explain the sum, declared total, number of affected rows, and treatment of `mayor_60_min`.
- Preserve source counts and denominators; do not impute the balance or modify indicators.
- Preserve the current visual identity and every metric and visualization.

## Review Focus

- Narrow chart cards with long labels and large counts must not force horizontal overflow; pin adaptive columns, wrapping, and the small-screen layout in a stylesheet-contract test.
- Long trend and association text must remain inside its chart card; assert wrapping and `min-width: 0` behavior in the same CSS test.
- A `mayor_60_min > mayor_15_min` row must remain distinguishable from a row with an ordinary reconciliation gap; test both warning codes.
- Exact workbook rows must remain included and not be deduplicated; assert 12 received/used, zero rejected, zero duplicate warnings, and 12 reconciliation warnings.
- Exclusive bucket counts must remain 96,111 against 97,200 declared, with every percentage using 97,200; pin totals and denominators in the exact-workbook test.

---

### Task 1: Fix Quantitative Chart Layout and Explain Source Discrepancies

**Files:**
- Modify: `src/components/QuantitativeInsights.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/evidence/calculations.ts`
- Modify: `src/lib/analysis/schemas.ts`
- Modify: `tests/lib/evidence/calculations.test.ts`
- Modify: `tests/components/QuantitativeInsights.test.tsx`
- Modify: `tests/api/analyze.test.ts`
- Create: `tests/styles/quantitative-layout.test.ts`

**Interfaces:**
- Consumes: `QuantitativeAnalysis`, its existing `warnings` array, the exact XLSX fixture, and current chart markup.
- Produces: `UNRECONCILED_TIME_BUCKETS` as a separate warning code; explanatory UI summary; responsive four-column charts with no changes to calculation totals or API fields.

- [ ] **Step 1: Add failing exact-workbook, component, and stylesheet tests**

Update the exact-workbook test to assert 12 rows received/used, zero rejected or duplicate rows, 12 `UNRECONCILED_TIME_BUCKETS` warnings, exclusive counts `[69460, 17290, 6726, 1546, 1089]`, sum `96111`, total `97200`, and each displayed percentage's denominator `97200`. Keep the test that a nested-range violation produces `INCONSISTENT_TIME_BUCKETS`.

Update the component test to assert the summary explains the affected row count, declared/summed totals, and that `mayor_60_min` is counted once.

Add a stylesheet test that asserts flexible columns with `minmax(0, ...)`, right-aligned metric cells, wrapping/min-width protections for chart text, a one-column comparison layout at `max-width: 760px`, and a stacked bar row at `max-width: 600px`.

- [ ] **Step 2: Run focused tests and confirm they fail**

Run: `npm test -- tests/lib/evidence/calculations.test.ts tests/components/QuantitativeInsights.test.tsx tests/api/analyze.test.ts tests/styles/quantitative-layout.test.ts`
Expected: FAIL because range-gap warnings are currently conflated with nested-range errors, the component lacks the explanatory summary, and chart rows still have fixed minimum widths.

- [ ] **Step 3: Separate reconciliation warnings and explain the actual source**

In `calculations.ts`, emit `UNRECONCILED_TIME_BUCKETS` only when `transferencias_totales` differs from the sum of exclusive buckets. Keep `INCONSISTENT_TIME_BUCKETS` for `mayor_60_min > mayor_15_min`; do not change exclusive bucket values, record inclusion, totals, or denominators. Add the new code to the Zod schema and include both warning codes in the existing data-quality limitation.

In `QuantitativeInsights.tsx`, summarize the number of affected rows, the actual sum versus declared total, and that `mayor_60_min` is subtracted from `mayor_15_min` then counted once. Preserve all detailed rows in the existing warning list where that list is displayed.

- [ ] **Step 4: Make the charts fit their available space**

In `globals.css`, use four flexible, shrinkable columns for label, track, percentage, and amount. Set `min-width: 0`, `overflow-wrap`, and right alignment on labels/metrics; constrain tracks to their parent; make chart-grid children shrinkable. Stack comparative charts at `max-width: 760px`; at `max-width: 600px`, place the label/percentage above the bar/count. Add wrapping protections to trend and association text without changing bar-value calculations.

- [ ] **Step 5: Run focused tests, the complete suite, lint, and build**

Run: `npm test -- tests/lib/evidence/calculations.test.ts tests/components/QuantitativeInsights.test.tsx tests/api/analyze.test.ts tests/styles/quantitative-layout.test.ts`
Expected: PASS.

Run: `npm test`
Expected: All tests PASS.

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: Production compilation and type validation PASS.
