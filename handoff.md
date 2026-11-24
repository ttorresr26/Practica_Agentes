# Handoff — Discovery AI Assistant

## Resumen

Discovery AI Assistant es un prototipo para Product Owners (PO). Ayuda a convertir una demanda inicial en una comprensión más explícita del posible problema del cliente, ordenar la evidencia disponible y recomendar un siguiente paso. No sustituye el criterio del PO ni toma decisiones de producto.

## Problema y proceso manual de referencia

El punto de partida del MVP es una demanda entrante que normalmente exige al PO interpretar qué necesidad del cliente podría haber detrás, reunir documentos y datos disponibles, separar hechos de suposiciones, localizar brechas, volver con preguntas a quienes solicitaron el trabajo y comparar qué conviene investigar antes de construir.

Este flujo manual dispersa el contexto entre texto, hojas de cálculo y conversaciones. El prototipo concentra en una sesión la demanda, fuentes disponibles, validaciones, hallazgos y recomendación. Esta descripción representa el problema de diseño del MVP; no es una medición de procesos internos ni una afirmación de ahorro de tiempo.

## Solución propuesta

El PO escribe o pega una demanda y puede adjuntar evidencia sintética o pública en XLSX, CSV, PDF con texto seleccionable o DOCX. El sistema procesa los archivos, muestra referencias a las fuentes, organiza afirmaciones, calcula indicadores de transferencias cuando los datos cumplen la estructura requerida, formula preguntas aclaratorias y presenta oportunidades y acciones candidatas.

El PO puede responder, volver a calcular y conservar las fuentes trazables. La recomendación es apoyo para decidir; la decisión final permanece con la persona usuaria.

## Arquitectura técnica

```text
Interfaz Next.js (navegador)
  └─ Demanda + adjuntos + confirmación de datos
       └─ POST /api/analyze (servidor Node.js)
            ├─ multipart y límites de carga
            ├─ validación y parsers XLSX / CSV / PDF / DOCX
            ├─ fuentes normalizadas con ID y localizador
            ├─ cálculos cuantitativos locales para transferencias
            └─ runAnalysis
                 ├─ structureDemand
                 ├─ analyzeEvidence
                 └─ adviseOpportunity
                      └─ respuesta validada con Zod
```

La aplicación usa Next.js App Router, React y TypeScript. El endpoint de análisis recibe multipart en el mismo proyecto. Los archivos se leen temporalmente en memoria; no se guardan en una base de datos, no se registran sus contenidos y las respuestas usan `Cache-Control: no-store`. Los límites de tamaño, cantidad, extracción y fuentes se detallan en [docs/file-processing.md](./docs/file-processing.md).

La coordinación es un flujo secuencial con tres roles especializados. No son tres procesos autónomos con memoria, herramientas propias o autoridad para actuar fuera del prototipo.

## Agentes y responsabilidades

| Rol | Implementación | Responsabilidad | Resultado |
|---|---|---|---|
| **Discovery** | `structureDemand` | Estructurar la demanda, proponer el problema del cliente y el grupo afectado, explicitar ambigüedades. | Marco del problema con referencias a fuentes. |
| **Evidence Analyst** | `analyzeEvidence` y parsers; cálculos en `calculateTransferMetrics` | Clasificar evidencia, detectar información faltante y limitaciones. Los cálculos de transferencias se realizan localmente, no se delegan al modelo. | Hechos declarados, datos calculados, inferencias, hipótesis, brechas, advertencias y métricas trazables. |
| **Opportunity Advisor** | `adviseOpportunity` | Comparar alternativas a partir del problema y evidencia disponible, explicitar incertidumbre y proponer la acción siguiente. | Oportunidades, alternativas, recomendación y preguntas aclaratorias. |

`runAnalysis` llama las etapas en orden `structure`, `evidence`, `advice`. Las respuestas se validan contra esquemas Zod; el orquestador rechaza referencias a fuentes inexistentes.

## IA real, simulación y cálculos

- **Modo predeterminado (`AI_PROVIDER=mock`):** no llama un modelo. `MockAnalysisProvider` produce resultados estructurados con reglas deterministas y escenarios de palabras clave. Es una simulación funcional, no IA generativa. La interfaz la etiqueta como simulada.
- **OpenAI opcional:** `OpenAIAnalysisProvider` existe en el servidor y requiere configuración explícita de `AI_PROVIDER`, `OPENAI_API_KEY` y `OPENAI_MODEL`. No se necesita para instalar, probar ni ejecutar el prototipo en modo predeterminado. Si se habilita, la demanda y los textos de fuente usados por las etapas cualitativas pueden enviarse al proveedor externo; deben mantenerse los límites de datos sintéticos/públicos y revisar las condiciones del proveedor.
- **Cálculos cuantitativos:** los indicadores de transferencias se calculan localmente y de forma determinista a partir de filas válidas de `Datos_transferencias`. No son una salida generada por el modelo y no demuestran causalidad. El flujo cuantitativo y el recálculo de respuestas del PO fuerzan el proveedor cualitativo simulado para no enviar esos datos a OpenAI.
- **Extracción:** los parsers leen datos estructurados y texto seleccionable. No hay OCR ni ejecución de macros/contenido incrustado.

## Tecnologías

- Next.js 15, React 19, TypeScript y CSS global.
- ExcelJS, `csv-parse`, PDF.js y Mammoth para la lectura local de los formatos admitidos.
- Busboy para multipart, Zod para validación de estructuras.
- Vitest, Testing Library y ESLint para pruebas y calidad.
- El lockfile de npm fija las versiones instalables.

## Construcción mediante Vibe Coding

La aplicación se construyó de forma iterativa sobre una arquitectura y un diseño funcional ya aprobados: primero se estableció la pantalla de entrada y el esqueleto Next.js; después se agregaron validaciones y parsers locales; luego, el flujo de tres etapas y las preguntas aclaratorias; posteriormente, los cálculos cuantitativos verificables; y, en ciclos sucesivos, se corrigieron regresiones del formulario, los estilos y la visualización responsive. Se usaron fixtures sintéticas para probar extracción, consistencia y trazabilidad sin datos reales.

El trabajo mantuvo el alcance por etapas: no añadió sistemas corporativos ni persistencia, conservó el motor simulado cuando el flujo requiere análisis local y verificó cambios con pruebas automatizadas, lint y compilación.

## Funcionalidades implementadas

- Captura de demanda en español, validación de campos y confirmación de política de datos.
- Carga y procesamiento de XLSX, CSV, PDF con texto seleccionable y DOCX, con límites y validación cliente/servidor.
- Referencias a hoja/fila, fila CSV, página PDF o párrafo de Word.
- Manejo de archivos vacíos, incompatibles o malformados y avisos de calidad.
- Análisis estructurado de demanda, evidencia, oportunidades y siguiente paso.
- Respuestas aclaratorias del PO incorporadas como fuentes trazables y recálculo.
- Métricas locales de transferencias, segmentación, tendencias, hallazgos y conciliación; presentación visual de KPI y comparativos.
- Exportación a HTML e impresión/guardado a PDF desde el navegador.
- Modo simulado sin credenciales y proveedor OpenAI opcional exclusivamente desde el servidor.

## Decisiones de diseño

- Comenzar por una demanda, sin exigir un cuestionario previo; adjuntar evidencia es opcional.
- Usar un flujo secuencial y auditable en vez de agentes autónomos irrestrictos.
- Mantener los cálculos cuantitativos deterministas y separados del texto generado.
- Conservar advertencias y discrepancias reales; no imputar cifras ni afirmar causalidad.
- Procesar archivos temporalmente y mantener las referencias para inspección.
- Mantener al PO en control de correcciones y decisión final.
- Usar la identidad visual del prototipo con su adaptación de colores y formas; no presentar el prototipo como una aplicación oficial ni lista para producción del banco.

## Pruebas y resultados

Las pruebas cubren parsers, validación de archivos, protección de datos, cálculos, orquestación, API, formulario, aclaraciones, visualizaciones, estilos y límites del paquete.

- `npm test`: **86 pruebas en 20 archivos, todas aprobadas**.
- `npm run lint`: aprobado.
- `npm run build`: compilación de producción y validación de tipos aprobadas.
- `npm test --prefix entrega-discovery-ai`: **86 pruebas en 20 archivos, todas aprobadas** desde la carpeta portable.
- `npm run lint --prefix entrega-discovery-ai`: aprobado.
- `npm run build --prefix entrega-discovery-ai`: compilación aprobada.
- `npm run start`: la pantalla principal respondió HTTP 200 y el CSS de producción respondió HTTP 200.

Al probar el build de la carpeta dentro del workspace original, Next.js informó que detectaba dos lockfiles debido a la copia anidada; la compilación terminó correctamente. La entrega extraída de forma independiente contiene un solo `package-lock.json`.

## Instalación y ejecución

Requisitos: Node.js `>=22.13.0` o `>=24` y npm `>=10`.

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000`. En Codespaces, abre la vista **Ports** y selecciona **Open in Browser** para el puerto `3000`. No se necesita archivo `.env.local` ni clave API para la ejecución predeterminada.

Verificaciones disponibles:

```bash
npm test
npm run lint
npm run build
npm run start
```

Para habilitar opcionalmente OpenAI en el servidor, crea `.env.local` a partir de `.env.example` y configura `AI_PROVIDER=openai`, `OPENAI_API_KEY` y `OPENAI_MODEL`. No compartas ni empaquetes ese archivo ni expongas la clave al navegador.

## Limitaciones conocidas y mejoras futuras

- El mock no aprende, razona con un modelo ni representa evidencia real; sus salidas siguen reglas deterministas.
- El proveedor OpenAI opcional requiere credenciales y conexión externa. No se usa en la configuración predeterminada.
- El filtro de patrones sensibles es de mejor esfuerzo: **no es DLP**, no garantiza anonimización y no puede autorizar el uso de datos reales.
- Los PDF escaneados no se procesan porque no hay OCR. No hay persistencia, autenticación, colaboración, navegación web, integración corporativa ni despliegue bancario.
- Los resultados agregados no demuestran experiencias individuales, correlación causal ni representatividad de clientes.
- Mejoras futuras sujetas a aprobación: evaluar el flujo con PO, ampliar pruebas de usabilidad, revisar política de proveedor y retención antes de uso real, y definir controles de seguridad/operación antes de cualquier entorno productivo.

No uses información real de clientes ni información confidencial de Banco Pichincha con este prototipo.
