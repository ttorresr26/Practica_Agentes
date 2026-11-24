# Procesamiento local de archivos

## Alcance

La interfaz envía la demanda y, si se adjuntan, los archivos al endpoint del propio proyecto `POST /api/analyze`. Para libros XLSX que contienen `Datos_transferencias`, la ruta calcula métricas descriptivas localmente y las incorpora a las tres etapas de Discovery. La hoja `LEEME` no se envía como fuente de evidencia.

La solicitud multipart se lee en memoria con límites de streaming. Los archivos no se escriben en disco, no se registran en logs ni se almacenan en una base de datos. El flujo cuantitativo de transferencias usa el proveedor local simulado para las etapas cualitativas; no llama a servicios externos. La respuesta se marca `Cache-Control: no-store`.

## Formatos y referencias

- **XLSX:** se normalizan en memoria los prefijos SpreadsheetML y las relaciones internas absolutas `/xl/...` que ExcelJS no interpreta correctamente; luego ExcelJS extrae hojas, encabezados, filas y valores. Las fórmulas no se ejecutan; si no hay un resultado almacenado, el valor se marca como no disponible. No se admiten macros, archivos incrustados, medios ni enlaces externos empaquetados.
- **CSV:** se admite UTF-8 y separador coma, punto y coma o tabulación. Se conservan los valores como texto, sin reinterpretar números, fechas o fórmulas. Las filas mal formadas se rechazan.
- **PDF:** PDF.js extrae texto seleccionable por página en streaming y cancela la lectura cuando se alcanza el límite de texto o elementos. No se aplica OCR; páginas sin texto se informan y un archivo sin texto legible se rechaza.
- **DOCX:** Mammoth extrae párrafos de texto. No se procesa contenido incrustado ni se promete una referencia a página.

Cada fuente recibe un identificador (`S001`, `S002`, ...), nombre de archivo y localizador: hoja/fila, fila CSV, página PDF o párrafo Word. Los encabezados y valores tabulares se devuelven estructurados. Hojas y páginas vacías se informan como observaciones; archivos vacíos, incompatibles o malformados se rechazan con un error controlado.

## Cálculos de transferencias

- Solo se usan filas de `Datos_transferencias`; `LEEME` queda fuera de las fuentes y afirmaciones del análisis.
- Se validan los encabezados, los segmentos `App móvil`/`Web`, `Mañana`/`Tarde`/`Noche`, los periodos de octubre/noviembre y los conteos enteros no negativos.
- Cada fila debe tener conteos de tiempo cuya suma sea igual a `transferencias_totales`. Las filas faltantes, inválidas o inconsistentes se omiten de los cálculos y aparecen en advertencias; no se corrigen ni se rellenan silenciosamente.
- Las tasas se ponderan por volumen, sumando numeradores y `transferencias_totales` antes de dividir. La demora comparada por canal, franja y periodo se define como **5 minutos o más**.
- El resultado incluye la distribución temporal, tasas generales de reclamos/fallidas, segmentación ponderada, hallazgos con fuentes por fila y advertencias de calidad. Si hay registros inválidos, la recomendación es investigar los datos antes de priorizar; con datos válidos, el siguiente paso es validar el segmento destacado.
- Los cálculos son deterministas y locales. Son descriptivos de los datos sintéticos o públicos suministrados; no demuestran causalidad ni la experiencia individual de clientes. El análisis cualitativo restante se identifica explícitamente como simulado.

## Límites

- 5 archivos por solicitud.
- 10 MB por archivo y 25 MB en total.
- Hasta 80.000 caracteres extraídos por solicitud; se rechaza el análisis completo si se supera, sin truncar contenido en silencio.
- Hasta 5.000 fuentes/filas extraídas por solicitud.
- La extracción PDF también limita a 80.000 los elementos de texto procesados por archivo.
- Los paquetes XLSX/DOCX se inspeccionan antes del parser, con máximo 2.000 entradas y 25 MB expandidos.
- Los PDF se limitan a 200 páginas.

El cliente valida extensión, tipo MIME declarado, cantidad y tamaño. El servidor repite la validación y además inspecciona la firma y estructura del archivo y ejecuta el parser correspondiente. La extensión y el MIME, por sí solos, no demuestran el tipo real.

## Protección de datos y limitaciones

La pantalla exige confirmar que la demanda y los adjuntos contienen solo información ficticia, sintética, agregada o pública. En el servidor hay un filtro local de mejor esfuerzo para correos, secuencias numéricas y etiquetas evidentes como “confidencial” o “uso interno”; los valores de celdas se examinan individualmente para no concatenar números agregados de columnas distintas. Si detecta un patrón, rechaza la solicitud sin devolver el contenido.

**Este filtro no es DLP ni puede identificar de forma fiable todos los datos personales, nombres o información confidencial de Banco Pichincha.** Una solicitud no detectada no se considera segura o anonimizada. No introduzcas datos reales de clientes ni información confidencial. El prototipo no hace OCR, análisis semántico, acceso corporativo, persistencia ni llamadas a modelos.

Los extractos se muestran como texto plano en la interfaz. No se renderiza HTML de los documentos. ExcelJS no calcula fórmulas; PDF.js se usa solo para leer texto, sin ejecutar acciones del documento; Mammoth extrae texto del documento Word. Los elementos y formatos no admitidos se rechazan o se omiten con una observación visible.

## Verificación

Ejecuta `npm test` para las pruebas unitarias de parsers, cálculos, segmentación y la integración del endpoint. Las fixtures de `tests/fixtures/synthetic/` son sintéticas. Para una prueba manual, selecciona el libro de transferencias sintético, confirma la política de datos y pulsa **Analizar demanda**. El resultado muestra KPIs, gráficos, tasas segmentadas, hallazgos trazables y advertencias de validación.
