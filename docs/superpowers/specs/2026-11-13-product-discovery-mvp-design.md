# Diseño del MVP: de la demanda a la oportunidad de producto

## Propósito

Ayudar a los Product Owners (PO) a convertir un requerimiento, incidente, necesidad de cliente o solicitud de negocio en una mejor comprensión del problema del cliente y en una recomendación sustentada sobre el siguiente paso. El MVP debe integrarse al trabajo cotidiano del PO, exigir únicamente la demanda original como entrada obligatoria y automatizar la preparación y el análisis sin ocultar la incertidumbre ni sustituir el criterio humano.

El prototipo se probará con escenarios bancarios ficticios sobre transferencias, tarjetas, canales digitales y atención al cliente. Solo utilizará información ficticia, sintética, agregada o pública. Quedan fuera del alcance los datos reales de clientes, la información confidencial de Banco Pichincha y las conexiones con sistemas corporativos.

## Objetivos

- Permitir que el PO inicie un análisis pegando o escribiendo una demanda, sin completar un formulario de descubrimiento de producto ni investigar previamente.
- Aceptar archivos opcionales `.xlsx`, `.csv`, `.pdf` y `.docx`, y analizarlos junto con la demanda.
- Identificar el problema del cliente, el grupo afectado, la evidencia, la incertidumbre, las oportunidades candidatas y un siguiente paso justificado.
- Etiquetar claramente cada afirmación como hecho, inferencia, hipótesis, información faltante o recomendación.
- Formular solo preguntas cuyas respuestas puedan cambiar de manera relevante el planteamiento del problema o la recomendación; permitir que el PO las omita y conservar visible la brecha.
- No inventar hechos, métricas, opiniones de clientes ni referencias. Indicar cuando la evidencia sea insuficiente y explicar cómo obtenerla.
- Mantener al PO en control de las correcciones y de la decisión final.

## Fuera de alcance

- Conectarse a sistemas de BP, almacenes de datos, registros de clientes, plataformas de incidentes u otras fuentes corporativas.
- Usar información personal de clientes o datos confidenciales de BP.
- Investigar en internet de manera autónoma en el primer prototipo. Se podrá analizar material público cuando el usuario lo adjunte como archivo.
- Modificar automáticamente el backlog, crear experimentos, contactar clientes o tomar decisiones de producto.
- Construir el ciclo de vida completo de producto, un repositorio persistente de descubrimiento, colaboración en equipo, administración de accesos o un despliegue bancario listo para producción.
- Demostrar un ahorro de cuatro horas o afirmar que una práctica de discovery causa rentabilidad.
- Incluir reconocimiento óptico de caracteres (OCR) para PDF escaneados, analítica predictiva, inferencia causal o proyecciones de casos de negocio.

## Enfoques considerados

### Punto de partida

- **De la demanda a la oportunidad, seleccionado:** partir de una demanda entrante real e investigar el problema del cliente que podría existir detrás. Es el enfoque que mejor conecta el MVP con la rutina actual del PO y permite probar el cambio de atender demandas a pensar en oportunidades.
- **De los datos a la oportunidad:** comenzar buscando patrones en conjuntos de datos de clientes o productos. Es más proactivo, pero requiere acceso confiable a datos y amplía el primer prototipo.
- **Espacio de discovery de extremo a extremo:** gestionar todas las etapas de discovery y los experimentos. Su alcance es mayor y dificulta aislar el valor de la primera prueba.

### Ejecución de la IA

- **IA simulada:** más rápida y útil para probar la navegación, pero no permite validar la extracción de archivos ni la calidad de la evidencia.
- **IA real con datos sintéticos o públicos, seleccionada:** permite probar el análisis real respetando los límites de datos acordados. La llamada al modelo debe hacerse desde el servidor mediante un proveedor configurado; ninguna credencial de API puede exponerse en el navegador.

### Organización de los agentes

- **Colaboración autónoma entre varios agentes independientes:** flexible, pero más difícil de controlar, probar y rastrear en un prototipo pequeño.
- **Un flujo orquestado con etapas especializadas, seleccionado como decisión de implementación:** usar una etapa para estructurar la demanda, otra para analizar la evidencia y una tercera para sintetizar oportunidades y decisiones. Cada etapa entrega resultados estructurados y referencias a las fuentes para la siguiente. Así se conserva una experiencia basada en agentes, limitando la complejidad de orquestación y manteniendo la trazabilidad.

## Usuario principal y flujo central

El usuario principal es un PO con poco tiempo y poca o ninguna práctica sistemática de descubrimiento de producto. El flujo central es:

1. **Iniciar un caso:** escribir o pegar la demanda entrante. Es la única entrada obligatoria. La aplicación puede inferir el tipo de demanda y permitir que el PO lo corrija sin completar un formulario.
2. **Agregar evidencia disponible (opcional):** adjuntar uno o más archivos compatibles. Un aviso breve aclara que el prototipo solo admite información ficticia, sintética, agregada o pública.
3. **Analizar:** la aplicación extrae texto legible y datos tabulares, informa qué archivos u hojas no pudo interpretar y analiza únicamente el contenido disponible.
4. **Plantear el problema:** mostrar una propuesta del problema del cliente, el grupo afectado, el contexto y por qué la demanda original podría o no representar una oportunidad de producto. El PO puede corregir o confirmar el planteamiento.
5. **Revisar evidencia y brechas:** mostrar por separado hechos con fuente, patrones derivados, inferencias, hipótesis, contradicciones e información faltante. Formular una pregunta breve solo si su respuesta puede cambiar la recomendación; explicar por qué importa y permitir responder “No lo sé” u omitirla.
6. **Revisar oportunidades y siguiente paso:** presentar una comparación breve y razonada de oportunidades candidatas, y recomendar una de cuatro acciones: profundizar la investigación, realizar un experimento, proponer una solución o descartar/dejar en espera la oportunidad. El PO toma la decisión final.

El primer prototipo no navegará la web pública ni consultará sistemas corporativos. Esta decisión reduce el alcance y facilita mantener la procedencia de la evidencia; el PO podrá adjuntar información pública para que la aplicación la analice.

### Idioma y evaluación inicial

- La interfaz, las instrucciones del modelo y los escenarios sintéticos estarán primero en español, con vocabulario bancario latinoamericano claro. Los formatos numéricos y de fecha seguirán los datos suministrados, sin asumir una única moneda o configuración regional.
- La persona usuaria indicó que actualmente no tiene acceso a Product Owners para probar el prototipo. La primera revisión podrá realizarse con quien patrocina el producto o con una persona sustituta, pero solo permitirá evaluar comprensión del flujo y comportamiento del análisis; no validará usabilidad, adopción ni ajuste a la rutina real de los PO. Más adelante será necesario evaluar directamente con ellos.

## Diseño funcional

### Entradas y análisis de archivos

- Obligatorio: texto libre con un requerimiento, solicitud, incidente o necesidad.
- Opcionales: archivos `.xlsx`, `.csv`, `.pdf` con texto seleccionable y `.docx`.
- Excel y CSV: extraer nombres de hojas y tablas, encabezados, filas, fechas, categorías y valores numéricos. Detectar columnas vacías o mal formadas y unidades ambiguas.
- PDF y Word: extraer texto, encabezados y contexto de página o sección cuando esté disponible. En este MVP, los PDF escaneados o compuestos solo por imágenes se reportan como ilegibles; no se incluye OCR.
- Usar análisis determinista para calcular conteos, tasas, tendencias y comparaciones. El modelo de lenguaje puede interpretar y explicar esos resultados, pero no debe inventar ni recalcular en silencio la evidencia numérica.
- Cada hecho o métrica extraída debe señalar su fuente: la demanda, nombre del archivo, hoja/fila/celda o tabla, o página del PDF/encabezado del documento Word cuando estén disponibles.
- El material no sustentado, contradictorio, incompleto o imposible de leer debe permanecer visible como limitación; el sistema no debe descartarlo en silencio.

### Modelo de análisis

Las etapas especializadas del flujo orquestado son:

- **Estructurador de la demanda:** identifica la solución o acción solicitada, el trabajo o problema subyacente, los posibles grupos de clientes afectados y las ambigüedades. Separa la solución propuesta por quien solicita de la evidencia de una necesidad del cliente.
- **Analista de evidencia:** extrae y organiza hechos respaldados por fuentes; analiza de forma descriptiva indicadores, tendencias, incidentes, reclamos y otros datos suministrados; señala problemas de calidad, cobertura, contradicciones y contexto faltante.
- **Asesor de oportunidades y decisiones:** crea oportunidades candidatas únicamente a partir del problema planteado y de la evidencia disponible, las compara con una justificación explícita y recomienda el siguiente paso mostrando evidencia e incertidumbre.

Estas son etapas de un flujo controlado, no agentes autónomos con herramientas sin restricciones. Ninguna etapa puede navegar la web, acceder a sistemas de BP ni realizar acciones externas.

### Vista de resultados

El resultado debe facilitar la inspección de la decisión, no limitarse a generar un informe narrativo. Debe incluir:

- Una descripción concisa del problema y del grupo de clientes afectado, con controles para que el PO la corrija.
- Un registro de evidencia organizado en **Hecho**, **Inferencia**, **Hipótesis**, **Información faltante** y **Recomendación**.
- Referencias a las fuentes junto a las afirmaciones factuales y las métricas calculadas.
- Oportunidades candidatas ordenadas cualitativamente, con una justificación visible basada en impacto para el cliente, relevancia para el negocio y solidez de la evidencia cuando los datos permitan evaluar esas dimensiones. No presentar una puntuación compuesta opaca ni inventar estimaciones de impacto no disponibles.
- Un estado de suficiencia de evidencia (**suficiente**, **parcial** o **insuficiente**) acompañado de una explicación clara.
- Una recomendación de siguiente paso: profundizar la investigación, realizar un experimento, proponer una solución o descartar/dejar en espera.
- Si la evidencia es insuficiente, especificar qué información adicional ayudaría, una forma viable de obtenerla y cualquier pregunta que deba responder el PO.
- Un registro de correcciones y decisiones del PO solo durante la sesión actual; no se incluye almacenamiento persistente.

## Criterio humano e interacción

- No se pide al PO que complete de antemano segmentos de clientes, hipótesis, métricas o planes de discovery.
- El PO puede corregir el planteamiento del problema, el grupo de clientes o la interpretación antes de aceptar la recomendación.
- Las preguntas aclaratorias solo se generan ante incertidumbres relevantes; se hacen de una en una, explican por qué importan y pueden omitirse.
- Una pregunta omitida se registra como información faltante, no se infiere como un hecho.
- El PO siempre elige la acción final. El prototipo no toma decisiones de producto, cumplimiento, clientes ni finanzas.

## Seguridad y manejo de datos

- El prototipo se limita a entradas ficticias, sintéticas, agregadas o públicas. El área de carga muestra esta restricción y no debe sugerir que es seguro subir datos reales de BP.
- No se pueden usar datos reales de clientes ni información confidencial de BP hasta que el banco autorice explícitamente un entorno y controles adecuados.
- No se configuran integraciones corporativas, credenciales para datos reales ni acceso a producción de BP.
- Las credenciales del modelo se mantienen en el servidor. Al proveedor configurado solo se pueden enviar la entrada sintética/pública y el contexto mínimo necesario para el análisis.
- Los archivos se procesan temporalmente durante la sesión; no se guardan en una base de datos ni en registros de la aplicación. La política de retención del proveedor debe tratarse como un requisito previo de implementación, sin prometer un comportamiento que el prototipo no controla.
- Solo se permiten los cuatro formatos declarados; se valida el tipo real del archivo, se rechazan archivos incompatibles o ilegibles con un mensaje claro y no se ejecutan macros ni contenido incrustado.
- Antes de usarlo, se debe configurar y revisar un proveedor de modelos para el prototipo con datos sintéticos/públicos. No se cambia silenciosamente a otro proveedor.

## Criterios de éxito del prototipo

- El PO puede iniciar un análisis escribiendo únicamente una demanda, sin completar un cuestionario extenso.
- Los archivos opcionales `.xlsx`, `.csv`, `.pdf` y `.docx` se analizan con referencias trazables o se reportan claramente como ilegibles/incompatibles.
- Toda afirmación factual puede rastrearse hasta una entrada suministrada; las inferencias y las hipótesis se etiquetan visiblemente.
- Se muestran las brechas y contradicciones de evidencia, y se recomienda cómo obtener la información faltante en lugar de inventar conclusiones.
- La recomendación termina en una de las cuatro rutas de decisión acordadas y explica su razonamiento.
- Los casos sintéticos cubren transferencias, tarjetas, canales digitales y atención al cliente; al menos uno presenta evidencia insuficiente y otro incluye un archivo mal formado o ilegible.
- Las pruebas de usabilidad con PO evalúan tiempo/esfuerzo, comprensión, capacidad de corregir a la IA y confianza en la recomendación. El prototipo no afirma demostrar un ahorro de cuatro horas; una comparación controlada posterior medirá tiempo y calidad de decisión.

## Decisiones de diseño para aprobación

- La información pública se proporciona como archivo; el MVP no investiga la web pública de forma autónoma.
- El comportamiento especializado de la IA se implementa como un flujo secuencial y estructurado, no como un conjunto abierto de agentes autónomos.
- El prototipo no incluye persistencia, autenticación, integraciones corporativas, OCR ni datos reales/confidenciales de clientes.
- Las dimensiones de impacto del producto se comparan cualitativamente solo cuando las entradas las sustentan; no se presupone una puntuación numérica única para las oportunidades.
- Las tecnologías web iniciales y el proveedor específico de modelos se definirán en el plan después de aprobar este diseño funcional; las credenciales del proveedor deben permanecer en el servidor.