# Discovery AI Assistant Final Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit, document, verify, and package Discovery AI Assistant as a portable course deliverable without removing working functionality.

**Architecture:** Keep the existing Next.js application and default deterministic mock behavior. Correct the reported analysis mode so it identifies the qualitative provider actually used, then document the existing stages and create a clean source package and ZIP.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, ESLint, npm lockfile, ZIP.

**Spec:** [2026-11-20-final-course-delivery-design.md](../specs/2026-11-20-final-course-delivery-design.md)

## Global Constraints

- “Mantener `AI_PROVIDER=mock` como valor predeterminado y no requerir credenciales para instalar, probar o ejecutar la aplicación.”
- “Mantener el campo `analysisMode` y ampliarlo de forma aditiva a `"mock" | "openai"`; representa el proveedor de las tres etapas cualitativas.”
- “Los cálculos cuantitativos siempre se identifican por separado como locales, y en los flujos cuantitativos/aclaratorios el proveedor cualitativo continúa siendo mock.”
- “No reconstruir la aplicación ni retirar funciones operativas.”
- “No añadir proveedores, modelos, APIs pagadas, claves, bases de datos, OCR o integraciones corporativas.”
- “El paquete debe excluir secretos, `.env`, `node_modules`, `.next`, `.git` y datos temporales.”
- “El soporte documentado será Node.js `>=22.13.0` o `>=24` y npm `>=10`.”

## Review Focus

- Sin variables de proveedor ni claves, el análisis debe continuar funcionando con mock y no debe contactar proveedores externos; pin con una prueba de integración API.
- Cuando se inyecta un proveedor OpenAI simulado, las etapas deben seguir el orden `structure`, `evidence`, `advice`, compartir proveedor y terminar con modo `openai`, sin llamadas de red; pin en la prueba de orquestación.
- Con un XLSX cuantitativo o una respuesta de aclaración, el modo cualitativo debe seguir siendo mock y los cálculos seguir siendo locales; pin con las pruebas API existentes.
- La UI debe distinguir correctamente los resultados simulados y los de OpenAI sin cambiar el contenido ni flujo del análisis; pin en `AnalysisResult.test.tsx`.
- La carpeta y el ZIP deben excluir `.env` local, dependencias instaladas, build y metadatos Git, pero conservar el lockfile, fuentes, fixtures sintéticas y documentación; verificar el listado del ZIP.

---

### Task 1: Reportar correctamente el modo de análisis

**Files:**
- Modify: `src/lib/analysis/types.ts`
- Modify: `src/lib/analysis/provider.ts`
- Modify: `src/lib/analysis/orchestrator.ts`
- Modify: `src/lib/analysis/schemas.ts`
- Modify: `src/app/api/analyze/route.ts`
- Modify: `src/components/AnalysisResult.tsx`
- Test: `tests/lib/analysis/orchestrator.test.ts`
- Test: `tests/lib/analysis/mock-provider.test.ts`
- Test: `tests/api/analyze.test.ts`
- Test: `tests/components/AnalysisResult.test.tsx`

**Interfaces:**
- Consumes: `AnalysisProvider.completeJson`, `AnalysisResponse.analysisMode`, and the existing explicit local-mock selection for quantitative and clarification requests.
- Produces: `AnalysisMode = "mock" | "openai"`; `AnalysisProvider.mode: AnalysisMode`; `runAnalysis()` reports `provider.mode`; `POST /api/analyze` preserves that value; the results UI labels each mode accurately.

- [ ] **Step 1: Add failing provider-mode tests**

Add a test provider with `mode: "openai"` and valid stage responses; assert that `runAnalysis()` calls stages in order `structure`, `evidence`, `advice` with that provider and returns `analysisMode: "openai"`. Add an API assertion that no configured provider uses mock and a component assertion for the OpenAI label. Preserve and assert that quantitative and clarification flows report mock.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/lib/analysis/orchestrator.test.ts tests/lib/analysis/mock-provider.test.ts tests/api/analyze.test.ts tests/components/AnalysisResult.test.tsx`
Expected: FAIL because the response type/schema and orchestrator/API currently force `analysisMode` to `"mock"`.

- [ ] **Step 3: Implement provider provenance**

Define `AnalysisMode` in `types.ts`; set `mode` on both providers; propagate it from `runAnalysis()` through the API response; accept both modes in the Zod response schema; and render explicit simulated/OpenAI labels. Keep local calculations independent and do not call OpenAI for quantitative or clarification requests.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/lib/analysis/orchestrator.test.ts tests/lib/analysis/mock-provider.test.ts tests/api/analyze.test.ts tests/components/AnalysisResult.test.tsx`
Expected: PASS with no external requests and all existing mock-mode behavior preserved.

### Task 2: Document installation and handoff

**Files:**
- Modify: `README.md`
- Create: `handoff.md`
- Reference: `docs/file-processing.md`

**Interfaces:**
- Consumes: the verified provider-mode contract from Task 1, current application architecture, existing processing documentation, and test/build results.
- Produces: Spanish setup instructions in `README.md`; a course-facing `handoff.md` covering every requested topic and distinguishing deterministic/local capabilities from optional OpenAI usage.

- [ ] **Step 1: Write the README**

Document prerequisites (Node.js `>=22.13.0` or `>=24`, npm `>=10`), `npm ci`, optional `.env.local` creation from `.env.example`, default keyless mock mode, `npm run dev`, Codespaces port 3000, and test/lint/build commands. State that OpenAI is optional and not needed for the default run.

- [ ] **Step 2: Write the handoff**

Cover the customer/product-discovery problem, original manual process, proposed solution, technical architecture, the three sequential agent roles and outputs, true AI versus deterministic simulation/local calculations, technologies, the Vibe Coding construction history, implemented capabilities, design decisions, final verified test results, execution instructions, limitations, and future improvements. Include the non-DLP warning and explain when optional OpenAI can send qualitative prompt content externally; insert final test counts after Task 3 validation.

- [ ] **Step 3: Verify documentation coverage**

Review the README commands against `package.json` and confirm each requested handoff topic has a section or explicit entry. Expected: no undocumented required environment variable and no claim that mock output is real model analysis.

### Task 3: Create and validate the portable delivery

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `tsconfig.json`
- Test: `tests/config/delivery-boundaries.test.ts`
- Create: `entrega-discovery-ai/` with an explicit copy of:
  - `src/`, `tests/`, `docs/file-processing.md`
  - `package.json`, `package-lock.json`
  - `.env.example`, `.gitignore`
  - `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`
  - `README.md`, `handoff.md`
- Create: `discovery-ai-assistant-entrega.zip`

**Interfaces:**
- Consumes: verified application, docs, and runtime requirements from Tasks 1–2.
- Produces: a portable source folder and ZIP; root lint/type-check exclude the nested delivery copy so future validation remains scoped to the working application.

- [ ] **Step 1: Add a failing test for root tooling boundaries**

Create a temporary `.ts` probe under `entrega-discovery-ai/` from the test, then assert that the root TypeScript project does not include it and root ESLint ignores it; remove only the probe in a `finally` block. The test must leave an existing delivery directory and its contents untouched.

- [ ] **Step 2: Run the boundary test and verify failure**

Run: `npm test -- tests/config/delivery-boundaries.test.ts`
Expected: FAIL because root TypeScript includes recursive `**/*.ts` and ESLint does not ignore the delivery folder.

- [ ] **Step 3: Configure and verify the tooling boundaries**

Exclude `entrega-discovery-ai/**` in the root ESLint flat config and `entrega-discovery-ai` in root `tsconfig.json`. Do not exclude the delivery itself from its copied configs.

Run: `npm test -- tests/config/delivery-boundaries.test.ts`
Expected: PASS.

- [ ] **Step 4: Create the delivery folder from explicit paths**

Copy only the listed files and directories. Do not copy `.env`/`.env.local`, `node_modules`, `.next`, `.git`, caches, temporary uploads, or any real customer data.

- [ ] **Step 5: Run final validation with the package directory present**

Run: `npm test`
Expected: all tests pass, with packaged copies not run as duplicate tests.

Run: `npm run lint`
Expected: PASS without linting the nested delivery copy.

Run: `npm run build`
Expected: production compilation and type validation PASS without traversing the delivery copy.

Run: `npm run build --prefix entrega-discovery-ai`
Expected: the packaged app also compiles using the locked project dependencies available in the workspace.

- [ ] **Step 6: Refresh handoff results in the project**

Remove the package-local `.next` generated by the package build, then write the exact final test, lint, and build results into `handoff.md`.

- [ ] **Step 7: Update the package copy and create the ZIP**

Copy the updated handoff into `entrega-discovery-ai/` and create `discovery-ai-assistant-entrega.zip` containing that folder.

- [ ] **Step 8: Inspect the ZIP**

Verify the lockfile, source, tests/fixtures, README, and handoff exist and forbidden paths/secrets are absent.

- [ ] **Step 9: Verify the production server**

Run: `npm run start` and request `http://localhost:3000`.
Expected: HTTP 200 in keyless default mode; the production CSS is also served successfully.
