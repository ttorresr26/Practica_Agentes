# Diseño: entrega final de Discovery AI Assistant

## Intención

Preparar una entrega portable y verificable de Discovery AI Assistant para el curso de A.I. Avanzado, conservando la aplicación y sus funcionalidades actuales. El paquete debe permitir instalar y ejecutar el modo predeterminado sin claves de API, servicios de pago, bases de datos ni conexiones corporativas.

## Estado actual

La aplicación usa Next.js App Router, React y TypeScript. La interfaz en español recibe una demanda, acepta XLSX/CSV/PDF/DOCX, muestra fuentes trazables y hallazgos, permite responder aclaraciones y exportar el informe a HTML o imprimirlo como PDF. `POST /api/analyze` valida y procesa los archivos en memoria. Los parsers, cálculos cuantitativos y validaciones de datos sensibles se ejecutan localmente; no hay OCR, base de datos ni persistencia.

La coordinación de descubrimiento es una secuencia de tres etapas: `structureDemand`, `analyzeEvidence` y `adviseOpportunity`, ejecutadas por `runAnalysis` y validadas con esquemas Zod. Corresponden a Discovery, Evidence Analyst y Opportunity Advisor, respectivamente; son roles funcionales en una orquestación, no procesos autónomos con memoria o herramientas propias.

El proveedor predeterminado es `MockAnalysisProvider`, que produce resultados simulados mediante reglas deterministas. Existe un `OpenAIAnalysisProvider` opcional configurado solo en el servidor. El flujo cuantitativo y el reprocesamiento de aclaraciones usan deliberadamente el proveedor simulado. Actualmente el modo de salida se declara siempre como `mock`, incluso si las etapas cualitativas sin esos casos usan OpenAI; se debe corregir el etiquetado para que la interfaz y el contrato distingan correctamente el proveedor utilizado, sin cambiar el proveedor predeterminado ni realizar llamadas externas en pruebas.

El proyecto tiene 19 archivos de prueba y 83 pruebas; la suite y ESLint pasan. La compilación de producción pasó en la verificación previa. `README.md` aún no documenta instalación o ejecución y no existe `handoff.md`.

## Objetivos

- Auditar el código existente y corregir solo fallos confirmados que afecten el funcionamiento, la seguridad o la descripción veraz de las capacidades.
- Conservar la identidad visual y las funcionalidades operativas.
- Mantener `AI_PROVIDER=mock` como valor predeterminado y no requerir credenciales para instalar, probar o ejecutar la aplicación.
- Mantener el campo `analysisMode` y ampliarlo de forma aditiva a `"mock" | "openai"`; representa el proveedor de las tres etapas cualitativas. Los cálculos cuantitativos siempre se identifican por separado como locales, y en los flujos cuantitativos/aclaratorios el proveedor cualitativo continúa siendo mock.
- Documentar las responsabilidades, entradas y salidas de cada etapa, distinguiendo cálculos locales, reglas simuladas y el proveedor OpenAI opcional.
- Crear `README.md` utilizable y `handoff.md` con los temas solicitados: problema, proceso anterior, propuesta, arquitectura, roles, tecnologías, Vibe Coding, funcionalidades, decisiones de diseño, pruebas, ejecución, limitaciones y mejoras futuras.
- Preparar `entrega-discovery-ai/` y `discovery-ai-assistant-entrega.zip` con fuente y configuración reproducible.
- Verificar pruebas, lint, build, ejecución sin credenciales y contenido del ZIP.

## No objetivos

- Reconstruir la aplicación o sustituir componentes, parsers o el motor simulado.
- Añadir proveedores, modelos, APIs pagadas, claves, bases de datos, OCR o integraciones corporativas.
- Cambiar cálculos, seguridad, parsers o comportamiento de análisis salvo que la auditoría demuestre un defecto directamente relacionado.
- Incluir `node_modules`, `.next`, `.git`, `.env` local, credenciales o información real de clientes en la entrega.

## Enfoques considerados

1. **Paquete portable de código y lockfile (seleccionado).** Copiar explícitamente el código, pruebas y fixtures sintéticas, archivos de configuración, `.env.example`, `README.md`, `handoff.md` y documentación de procesamiento a `entrega-discovery-ai/`; crear un ZIP con el mismo contenido. El destinatario instala dependencias con `npm ci`. Es liviano y evita incluir secretos o artefactos ligados al sistema operativo.
2. **Paquete con dependencias instaladas o build incluido.** Puede reducir la preparación inicial, pero aumenta mucho el tamaño y puede no funcionar de forma idéntica en otro sistema operativo.
3. **Comprimir el workspace completo.** Se descarta porque puede incluir `.git`, caches, dependencias, archivos locales o información no destinada al curso.

## Decisiones y restricciones

- Se eligió el primer enfoque a solicitud del usuario.
- El modo `mock` permanece como predeterminado. La opción OpenAI existente se documenta como opcional y externa: solo se activa con configuración explícita del servidor y puede enviar al proveedor los textos usados por las etapas cualitativas; nunca se incluye una API key en el cliente o paquete.
- El soporte documentado será Node.js `>=22.13.0` o `>=24` y npm `>=10`; la verificación de este entorno usa Node.js 24.22.2 y npm 11.19.1. Esta base satisface el requisito de `pdfjs-dist` (`>=22.13.0 || >=24`).
- Los datos de carga siguen siendo sintéticos, agregados o públicos. La detección local es de mejor esfuerzo, no una garantía de anonimización.
- La carpeta y el ZIP se generan desde una lista explícita de archivos; no se copia indiscriminadamente la raíz del workspace.
- Se conserva la identidad visual presente. No se hacen cambios cosméticos no solicitados.

## Verificación y aceptación

- `npm test`: todas las pruebas existentes pasan, con pruebas específicas para etiquetado de modo y ejecución simulada sin claves si se cambia ese contrato.
- `npm run lint` y `npm run build`: pasan.
- La app carga en modo predeterminado sin `.env.local`, credenciales ni servicios externos.
- El README describe instalación y arranque; el handoff cubre todos los puntos solicitados y no presenta resultados simulados como capacidades de IA real.
- La entrega incluye fuente, manifiestos y lockfile, configuración, pruebas y fixtures sintéticas; excluye secretos, `.git`, `node_modules` y `.next`.
- El ZIP se puede listar y contiene la carpeta de entrega esperada.
