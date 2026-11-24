# Banco Pichincha Visual Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a public Banco Pichincha-inspired palette and rounded form language to the existing Discovery AI Assistant UI without changing its layout or behavior.

**Architecture:** Keep the existing Next.js component hierarchy and centralize the visual update in `src/app/globals.css`. Add a focused stylesheet-contract test for the key brand colors and shape tokens so the intended theme remains connected to the primary UI elements.

**Tech Stack:** Next.js, React, TypeScript, global CSS, Vitest.

**Spec:** [2026-11-20-banco-pichincha-visual-style-design.md](../specs/2026-11-20-banco-pichincha-visual-style-design.md)

## Global Constraints

- Reemplazar el verde de marca actual por azul marino `#0F265C` y amarillo `#FFDD00`, obtenidos del logotipo oficial.
- Usar azul marino para texto/acciones y amarillo con texto azul para acentos destacados.
- Unificar las esquinas en torno a controles de 8 px y tarjetas de 16–20 px; reservar una esquina asimétrica como acento visual y no aplicarla indiscriminadamente.
- Conservar colores semánticos de error y advertencia, con contraste legible.
- Conservar la estructura, el contenido, la interacción responsive y todas las funciones del asistente.
- No copiar ni incorporar el logotipo oficial, no añadir dependencias y no cambiar endpoints, cálculos o lógica.

## Review Focus

- Primary yellow actions must use navy foreground text for readable contrast; pin this in the stylesheet-contract test.
- Branding must apply to the entry form, results, processing indicators, and clarifications without removing existing responsive rules; verify existing component tests and production build after the CSS change.

---

### Task 1: Apply Brand Palette and Shape Tokens

**Files:**
- Modify: `src/app/globals.css`
- Create: `tests/styles/banco-pichincha-theme.test.ts`

**Interfaces:**
- Consumes: Existing global CSS selectors and component class names.
- Produces: Root tokens for `--brand-navy` (`#0F265C`), `--brand-yellow` (`#FFDD00`), soft yellow and neutral surfaces, plus control/card radii used by current selectors.

- [ ] **Step 1: Write a failing stylesheet-contract test**

Add a test that reads `src/app/globals.css` and asserts:
- The root defines the official navy and yellow values.
- `.primary-button` uses yellow background, navy text, and the control-radius token.
- `.brand-mark` uses the yellow/navy pairing.
- `.entry-card` and `.analysis-results` use the shared card-radius token.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- tests/styles/banco-pichincha-theme.test.ts`
Expected: FAIL because the current stylesheet uses the old green palette and has no brand shape tokens.

- [ ] **Step 3: Update the existing global stylesheet**

Define the palette and shape tokens in `:root`, then update the existing selectors across the entry form, processing state, results, quantitative charts/tables, opportunities, clarifications, and recommendation to use those tokens. Use navy text on yellow primary actions, keep feedback colors semantic, and preserve all current responsive rules.

- [ ] **Step 4: Run focused and full checks**

Run: `npm test -- tests/styles/banco-pichincha-theme.test.ts`
Expected: PASS.

Run: `npm test`
Expected: All tests PASS.

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: Production compilation and type validation PASS.
