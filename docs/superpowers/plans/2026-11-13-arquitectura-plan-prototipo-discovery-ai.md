# Arquitectura y plan de implementación: Discovery AI Assistant

> Para la implementación: ejecutar las etapas en orden, completar sus pruebas antes de avanzar y conservar el alcance del diseño funcional aprobado.

**Objetivo:** construir un prototipo web que convierta una demanda escrita por el PO, con archivos opcionales, en una recomendación sustentada sobre el problema del cliente y el siguiente paso.

**Arquitectura:** una aplicación Next.js con TypeScript contendrá la interfaz y un endpoint servidor. El endpoint validará y procesará las entradas en memoria, normalizará la evidencia y ejecutará tres etapas de IA secuenciales; la respuesta incluirá referencias verificables a las fuentes y no se almacenará en una base de datos.

**Tecnologías propuestas:** Node.js 24 y npm; Next.js App Router, React y TypeScript; OpenAI como único proveedor de IA; Zod para validar datos; ExcelJS, csv-parse, PDF.js y Mammoth para procesar archivos; Vitest y Testing Library para pruebas.

**Diseño funcional aprobado:** [Diseño del MVP: de la demanda a la oportunidad de producto](../specs/2026-11-13-product-discovery-mvp-design.md)

## Restricciones globales

- La demanda en texto libre es la única entrada obligatoria; los archivos son opcionales.
- Formatos admitidos: `.xlsx`, `.csv`, PDF con texto seleccionable y `.docx`.
- Solo se utilizarán datos ficticios, sintéticos, agregados o públicos; no se conectarán sistemas corporativos.
- No se incluirán base de datos, almacenamiento persistente, autenticación ni herramientas externas para los agentes.
- El proveedor será OpenAI únicamente en este prototipo; `OPENAI_API_KEY` y `OPENAI_MODEL` se configuran en el servidor. Si faltan, la API debe informar un error explícito sin fallback.
- Los hechos necesitan referencias válidas a las entradas. Una solicitud del negocio es evidencia de que se recibió esa solicitud, no prueba por sí sola de que todos los clientes sufran el problema descrito.
- Los cálculos numéricos serán deterministas; la IA podrá interpretarlos, pero no inventar métricas ni cifras.
- No se afirmará un ahorro de cuatro horas ni una relación causal con rentabilidad.
- Todos los textos de interfaz, errores y escenarios del prototipo estarán en español.

## Foco de revisión

- Archivo con extensión/MIME no permitido, corrupto o demasiado grande: rechazarlo con un mensaje comprensible y sin procesarlo parcialmente en silencio; probar en la etapa 3.
- PDF escaneado, hoja vacía o documento sin texto: marcar la fuente como ilegible o insuficiente, sin fabricar hallazgos; probar en la etapa 3.
- Hoja de cálculo con fechas, unidades o decimales ambiguos: mostrar la ambigüedad y no afirmar tendencias no verificadas; probar en la etapa 3.
- Documento que contiene instrucciones dirigidas al modelo: tratar el contenido del archivo como datos no confiables, no como instrucciones; probar en las etapas 2 y 5.
- Respuesta del modelo con identificadores de fuente inexistentes o sin evidencia para una afirmación factual: rechazarla o devolver un error controlado, nunca mostrarla como hecho; probar en las etapas 2 y 4.
- Proveedor o modelo sin configurar o no disponible: mostrar un error explícito y no cambiar de proveedor; probar en las etapas 2 y 5.

---

## Arquitectura técnica

### Estructura

```text
Navegador
  └─ Interfaz React en español
       └─ POST /api/analyze (multipart/form-data)
            ├─ Validación de entrada y archivos
            ├─ Adaptadores de archivo -> fuentes normalizadas
            ├─ Cálculos descriptivos deterministas
            ├─ Orquestador de tres etapas con OpenAI
            ├─ Validación Zod + comprobación de referencias
            └─ Respuesta JSON -> interfaz de resultados
```

Next.js alojará la interfaz y el endpoint en un solo proyecto. El procesamiento de archivos y las llamadas al modelo ocurrirán en el servidor; el navegador nunca recibirá las credenciales. La solicitud y sus archivos vivirán solo en memoria durante el análisis y la sesión del navegador, sin base de datos ni escritura de archivos al disco.

### Componentes

| Componente | Responsabilidad |
|---|---|
| `src/app/page.tsx` | Componer la pantalla del caso: entrada de demanda, archivos, progreso y resultados. |
| `src/components/DemandForm.tsx` | Capturar la demanda requerida y adjuntar archivos opcionales en los formatos permitidos. |
| `src/components/AnalysisResult.tsx` | Mostrar problema, oportunidades, suficiencia de evidencia y recomendación. |
| `src/components/EvidenceLedger.tsx` | Mostrar hechos, inferencias, hipótesis, información faltante y recomendaciones con sus fuentes. |
| `src/components/ClarifyingQuestion.tsx` | Presentar una pregunta necesaria, el motivo, la respuesta del PO y la opción de omitirla. |
| `src/app/api/analyze/route.ts` | Validar la solicitud HTTP, coordinar análisis y archivos y responder con JSON. |
| `src/lib/evidence/` | Validar archivos, extraer texto y tablas, generar referencias y calcular indicadores descriptivos. |
| `src/lib/analysis/` | Tipos, esquemas, proveedor de IA, instrucciones de etapa y orquestación. |

No se agregará una biblioteca de componentes visuales ni una capa de persistencia: no hay una convención existente en el repositorio que lo requiera.

### API del análisis

`POST /api/analyze` recibe `multipart/form-data` con:

- `demand`: texto requerido.
- `files`: cero o más archivos permitidos.
- `clarifications`: respuestas u omisiones de preguntas previas, si las hubo.

Devuelve `AnalysisResponse` validado, con:

- `status`: `needs_clarification` o `complete`.
- `problemFrame`: problema propuesto, grupo afectado y ambigüedades.
- `claims`: afirmaciones tipadas como `fact`, `inference`, `hypothesis`, `missing_information` o `recommendation`.
- `opportunities`: candidatas y razones de priorización cualitativa.
- `evidenceStatus`: `sufficient`, `partial` o `insufficient`, con motivo.
- `clarifyingQuestion`: opcional, con pregunta y por qué su respuesta podría cambiar la recomendación.
- `recommendation`: acción `investigate`, `experiment`, `solution` o `discard`, con evidencia y asuntos pendientes.
- `sources`: índice de referencias que usa la interfaz para mostrar de dónde procede cada afirmación.

Si hay una pregunta material sin contestar, la respuesta será `needs_clarification`. El navegador conserva el texto y los archivos seleccionados y los vuelve a enviar junto con la respuesta u omisión; el servidor no crea una sesión persistente.

### Orquestación de IA

Las tres funciones tienen contratos separados y se ejecutan secuencialmente. Todas usan el mismo proveedor configurado y reciben salidas JSON estructuradas que se validan con Zod.

1. `structureDemand({ demand }) -> DemandFrame`: distingue la solución solicitada del problema que podría haber detrás, identifica posibles usuarios afectados y señala ambigüedades. No convierte una afirmación de la solicitud en un hecho del cliente.
2. `analyzeEvidence({ frame, sources, calculations, clarifications }) -> EvidenceAnalysis`: relaciona datos y textos suministrados con el problema, identifica patrones descriptivos, contradicciones, brechas y, si realmente puede cambiar la recomendación, una pregunta aclaratoria.
3. `adviseOpportunity({ frame, evidence }) -> OpportunityAdvice`: compara candidatas con justificación cualitativa y elige una acción siguiente. Si la evidencia no alcanza, recomienda qué obtener y no presenta una solución como probada.

`runAnalysis(input) -> AnalysisResponse` coordina las etapas. La integración no ofrece herramientas de navegación, acceso corporativo ni acciones externas; el contenido de archivos se considera entrada no confiable y nunca instrucción para el modelo.

### Procesamiento de archivos

Todos los adaptadores producen `EvidenceSource` con `id`, `fileName`, `sourceType`, `locator` y `excerpt` o datos normalizados. Los cálculos generan también fuentes trazables, no afirmaciones libres del modelo.

| Formato | Biblioteca propuesta | Referencia de origen |
|---|---|---|
| `.xlsx` | ExcelJS | Nombre de hoja y coordenadas de celda/fila; celdas con fórmula sin valor calculado se marcan como no disponibles. |
| `.csv` | `csv-parse` | Nombre de archivo y número de fila; delimitadores admitidos: coma, punto y coma y tabulación. Los valores numéricos ambiguos no se reinterpretan. |
| `.pdf` con texto | `pdfjs-dist` | Número de página y fragmento extraído. Si no se extrae texto, se informa que el archivo es ilegible para este MVP. |
| `.docx` | Mammoth | Encabezado o índice de párrafo y fragmento extraído; no se promete una referencia a página. |

Límites técnicos iniciales propuestos para el prototipo: máximo 5 archivos por análisis, 10 MB por archivo, 25 MB en total y 80.000 caracteres extraídos por solicitud. Si se exceden, se rechaza el análisis completo con instrucciones para reducir la entrada; no se trunca evidencia en silencio. No se incluye OCR, macros, contenido incrustado ni fórmulas ejecutables.

### Referencias y trazabilidad

- El texto de demanda y cada archivo/fragmento reciben un ID de fuente creado por el servidor, por ejemplo `S001`.
- Los localizadores son concretos: demanda y rango de caracteres; archivo/hoja/celda o fila; PDF/página; documento Word/encabezado o párrafo.
- Cada afirmación factual incluye uno o más `sourceIds`. El servidor comprueba que existan y que correspondan a entradas recibidas.
- Una afirmación sin referencia válida no se muestra como hecho. Debe reformularse como inferencia/hipótesis si corresponde, o marcarse como información faltante.
- La interfaz presenta las referencias junto a la afirmación y permite inspeccionar el fragmento o valor utilizado.
- Un cálculo guarda su fórmula descriptiva, valores de entrada y fuentes originales para que el resultado pueda verificarse.

### Seguridad y credenciales

- Proveedor único propuesto: OpenAI. Configuración requerida: `OPENAI_API_KEY` y `OPENAI_MODEL`; si falta cualquiera, responder con `503 PROVIDER_NOT_CONFIGURED` y un mensaje en español. No hay proveedor alternativo ni modelo predeterminado silencioso.
- La clave se guarda localmente en `.env.local`, excluido por `.gitignore`; `.env.example` contiene nombres de variables vacías, nunca valores reales.
- No registrar demanda, fragmentos, adjuntos ni respuestas completas del proveedor en logs.
- Limitar tipos, cantidad y tamaño; validar extensión y MIME y manejar errores de parser sin exposición de stack traces en la interfaz.
- Probar únicamente con datos sintéticos, agregados o públicos. El proveedor externo podría tener su propia política de retención; revisar esa política antes de las pruebas y no prometer retención cero fuera del control de la aplicación.
- No crear base de datos, almacenamiento de adjuntos, cuentas, conexiones corporativas ni credenciales de BP.

### Estrategia de pruebas

- Vitest para validación, parsers, cálculos, esquemas, etapas y API; Testing Library para la interfaz.
- Probar la orquestación con un cliente OpenAI simulado por inyección de dependencia en pruebas. Este doble de prueba no es un proveedor alternativo ejecutable en la aplicación.
- Verificar una prueba manual en vivo solo después de configurar explícitamente `OPENAI_API_KEY` y `OPENAI_MODEL`, usando escenarios sintéticos.
- Fixtures sintéticos: transferencias demoradas, rechazos de tarjetas, incidentes de canal digital y reclamos/tiempos de atención; incluir un caso con evidencia insuficiente y archivos ilegibles o inválidos.
- No probar nunca con datos reales de clientes ni información confidencial del banco.

## Plan de implementación por etapas

### Etapa 1: base del proyecto e ingreso de demanda

**Archivos:**
- Crear: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`.
- Crear: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- Crear: `src/components/DemandForm.tsx`.
- Prueba: `tests/components/DemandForm.test.tsx`.

**Resultado:** aplicación Next.js ejecutable en español; formulario con demanda requerida, selector opcional de archivos limitados a los cuatro formatos, aviso de seguridad y estados vacíos/error. No se reemplazan `README.md`, `docs/`, `.agents/` ni `skills-lock.json`.

- [ ] **Paso 1: configurar Next.js, TypeScript, ESLint, Vitest y Testing Library sin tocar documentos o skills existentes.**
- [ ] **Paso 2: escribir pruebas del formulario** para demanda vacía/requerida, texto válido y rechazo visual de extensiones no permitidas.
- [ ] **Paso 3: ejecutar la prueba para comprobar que falla antes de implementar.** Ejecutar `npm test -- DemandForm.test.tsx`; debe fallar por falta del componente.
- [ ] **Paso 4: implementar `DemandForm` y la página inicial con el aviso de datos sintéticos/públicos.**
- [ ] **Paso 5: ejecutar `npm test -- DemandForm.test.tsx` y `npm run lint`; deben pasar.**

### Etapa 2: análisis funcional de una demanda con IA

**Archivos:**
- Crear: `src/lib/analysis/types.ts`, `schemas.ts`, `provider.ts`, `stages.ts`, `orchestrator.ts`.
- Crear: `src/app/api/analyze/route.ts`, `src/components/AnalysisResult.tsx`.
- Pruebas: `tests/lib/analysis/orchestrator.test.ts`, `tests/api/analyze.test.ts`, `tests/components/AnalysisResult.test.tsx`.

**Interfaces:**
- `structureDemand({ demand: string }): Promise<DemandFrame>`.
- `analyzeEvidence({ frame: DemandFrame, sources: EvidenceSource[], clarifications: Clarification[] }): Promise<EvidenceAnalysis>`.
- `adviseOpportunity({ frame: DemandFrame, evidence: EvidenceAnalysis }): Promise<OpportunityAdvice>`.
- `runAnalysis(input: AnalysisInput): Promise<AnalysisResponse>`.
- `POST /api/analyze` consume `demand` y devuelve `AnalysisResponse`; los errores de configuración se distinguen de errores de análisis.

**Resultado:** primera ruta vertical funcional de texto de demanda a recomendación de IA, con la demanda registrada como fuente y sin archivos todavía.

- [ ] **Paso 1: definir tipos y esquemas Zod** para hechos, inferencias, hipótesis, información faltante, oportunidades y recomendación.
- [ ] **Paso 2: escribir pruebas** para el orden de las tres etapas, respuesta estructurada, referencias válidas, `503` sin configuración y error controlado ante salida inválida del modelo.
- [ ] **Paso 3: ejecutar las pruebas para comprobar que fallan.** Ejecutar `npm test -- orchestrator.test.ts analyze.test.ts`.
- [ ] **Paso 4: implementar el cliente OpenAI del lado servidor, las tres etapas y el orquestador.** Cada etapa recibe su contrato tipado; validar toda respuesta con Zod y comprobar los `sourceIds`.
- [ ] **Paso 5: implementar `POST /api/analyze` y conectar la demanda del formulario con el resultado básico.** Si faltan `OPENAI_API_KEY` u `OPENAI_MODEL`, devolver `503 PROVIDER_NOT_CONFIGURED`; no usar fallback.
- [ ] **Paso 6: ejecutar `npm test -- orchestrator.test.ts analyze.test.ts AnalysisResult.test.tsx`; debe pasar con cliente de IA simulado en pruebas.**

### Etapa 3: carga, lectura y análisis determinista de archivos

**Archivos:**
- Crear: `src/lib/evidence/types.ts`, `validate-upload.ts`, `normalize.ts`, `calculations.ts`.
- Crear: `src/lib/evidence/parsers/xlsx.ts`, `csv.ts`, `pdf.ts`, `docx.ts`.
- Pruebas: `tests/lib/evidence/xlsx.test.ts`, `csv.test.ts`, `pdf.test.ts`, `docx.test.ts`, `calculations.test.ts`.
- Fixtures sintéticos: `tests/fixtures/synthetic/`.

**Interfaces:**
- `parseUpload(file: File): Promise<EvidenceSource[]>` despacha al adaptador según formato validado.
- `calculateMetrics(sources: EvidenceSource[]): CalculationSource[]` devuelve solo cálculos descriptivos reproducibles y sus IDs de origen.

- [ ] **Paso 1: crear fixtures pequeños y sintéticos** para Excel, CSV, PDF textual y Word; incluir una hoja vacía, un CSV con delimitador `;`, un PDF escaneado y un archivo corrupto.
- [ ] **Paso 2: escribir pruebas** para referencias por hoja/celda/fila/página/párrafo, límites de tamaño, extensión incompatible y contenido ilegible.
- [ ] **Paso 3: ejecutar `npm test -- tests/lib/evidence`; confirmar fallos esperados antes de implementar.**
- [ ] **Paso 4: implementar validación y adaptadores con ExcelJS, `csv-parse`, `pdfjs-dist` y Mammoth.** No ejecutar fórmulas/macros; señalar fórmulas sin valores calculados.
- [ ] **Paso 5: implementar conteos, tasas y tendencias descriptivas cuando los campos sean inequívocos; marcar valores ambiguos sin reinterpretarlos.**
- [ ] **Paso 6: integrar las fuentes y cálculos al endpoint y a la orquestación; el modelo recibe texto y referencias, no archivos binarios.**
- [ ] **Paso 7: ejecutar todas las pruebas de parsers y endpoint; comprobar referencias visibles para cada hallazgo.**

### Etapa 4: evidencia, preguntas esenciales y decisión del PO

**Archivos:**
- Crear: `src/components/EvidenceLedger.tsx`, `src/components/ClarifyingQuestion.tsx`, `src/components/OpportunityList.tsx`.
- Modificar: `src/components/AnalysisResult.tsx`, `src/components/DemandForm.tsx`, `src/app/api/analyze/route.ts`.
- Pruebas: `tests/components/EvidenceLedger.test.tsx`, `ClarifyingQuestion.test.tsx`, `OpportunityList.test.tsx`.

- [ ] **Paso 1: escribir pruebas** que distingan las cinco etiquetas de afirmaciones, abran una referencia, permitan corregir el planteamiento y muestren una pregunta con motivo y opción de omitirla.
- [ ] **Paso 2: ejecutar las pruebas para confirmar los fallos esperados.** Ejecutar `npm test -- EvidenceLedger.test.tsx ClarifyingQuestion.test.tsx OpportunityList.test.tsx`.
- [ ] **Paso 3: implementar el registro de evidencia con referencias, estado suficiente/parcial/insuficiente y orden cualitativo de oportunidades sin puntuación compuesta.**
- [ ] **Paso 4: implementar respuesta u omisión de una pregunta material; reenviar demanda y archivos desde el navegador sin crear persistencia servidor.**
- [ ] **Paso 5: mostrar una recomendación entre investigar, experimentar, proponer solución o descartar, con razones, fuentes y vacíos.**
- [ ] **Paso 6: ejecutar pruebas de componentes y API; verificar que una omisión se muestre como información faltante y no se convierta en un hecho.**

### Etapa 5: escenarios sintéticos, revisión de seguridad y entrega

**Archivos:**
- Crear: `tests/fixtures/synthetic/transferencias/`, `tarjetas/`, `canales-digitales/`, `atencion-cliente/`.
- Modificar: `README.md`, `.gitignore` y los componentes o validadores solo si las pruebas revelan defectos dentro del alcance.

- [ ] **Paso 1: crear escenarios sintéticos** para transferencias, tarjetas, canales digitales y atención al cliente; incluir al menos un caso con evidencia insuficiente.
- [ ] **Paso 2: probar entradas con instrucciones hostiles dentro de archivos, IDs de fuente inventados, datos ambiguos y adjuntos inválidos;** la aplicación debe conservar los límites de evidencia y seguridad.
- [ ] **Paso 3: ejecutar `npm test`, `npm run lint` y `npm run build`; resolver fallos antes de la siguiente etapa.**
- [ ] **Paso 4: actualizar el README en español** con requisitos, instalación, variables de entorno, ejecución y pruebas. No incluir claves reales.
- [ ] **Paso 5: realizar una prueba manual con datos sintéticos y proveedor explícitamente configurado; si falta configuración, comprobar el mensaje de error sin fallback.**
- [ ] **Paso 6: iniciar el servidor de desarrollo y explicar al usuario cómo recorrer el flujo y probar los casos sintéticos.**

## Revisión del plan

- El primer entregable funcional aparece en la etapa 2: demanda de texto, análisis IA de tres etapas y recomendación; los archivos se agregan en la etapa 3.
- Los cuatro formatos, trazabilidad, cálculos, preguntas humanas, proveedor explícito, ausencia de persistencia e información sintética tienen tareas y pruebas asignadas.
- No se incluye navegador web, integración corporativa, base de datos, OCR, almacenamiento, decisiones automáticas ni estimación de ahorro de cuatro horas.
- Los límites iniciales propuestos (5 archivos, 10 MB por archivo, 25 MB totales y 80.000 caracteres extraídos) son decisiones técnicas para controlar recursos y deben mostrarse al usuario; pueden ajustarse antes de implementar.
- Propuesta técnica para revisar: OpenAI será el único proveedor del prototipo. La arquitectura no cambiará a otro proveedor si faltan credenciales o configuración.