# Evidencia externa para Product Discovery en banca

## Alcance y lectura

La persona usuaria aporta el siguiente **contexto interno sobre Banco Pichincha**, basado en su conocimiento de la organización y de los Product Owners (PO): alta carga operativa, poco Product Discovery y dificultades para incorporar la perspectiva del cliente y analizar datos. Esta revisión no intenta probar ni refutar la prevalencia local de esas observaciones.

La revisión reúne literatura académica, estudios de campo, investigaciones experimentales y guías profesionales. En cada hallazgo se distingue el resultado publicado de sus límites. La transferibilidad a PO bancarios de una entidad de alrededor de 7.000 personas es variable; salvo que se indique lo contrario, los estudios no son de Banco Pichincha ni de bancos comparables por tamaño.

**Conclusión ejecutiva:** la evidencia externa sustenta que la gestión de producto suele implicar tensiones entre entender el valor para el cliente, prioridades cambiantes y trabajo reactivo/proactivo; estudios bancarios describen barreras organizacionales relacionadas con conocimiento de mercado y participación de clientes y empleados. Hay evidencia cuantitativa de que IA generativa reduce tiempo o aumenta productividad en tareas acotadas, pero los resultados dependen de la tarea y experiencia. La evidencia directa sobre agentes en Product Discovery es emergente: un estudio CHI de 2026 encontró utilidad para patrones grupales en evaluación temprana, pero no para sustituir la perspectiva individual. Ninguna fuente examinada demuestra un ahorro de cuatro horas en discovery bancario ni que discovery cause rentabilidad.

## 1. Retos de PO y PM en Product Discovery

| Fuente y fecha | Metodología | Resultados publicados | Limitaciones |
|---|---|---|---|
| [A comprehensive overview of software product management challenges](https://doi.org/10.1007/s10664-022-10134-5), 2022, *Empirical Software Engineering* | Triangulación de revisión sistemática en cinco bases de datos, entrevistas semiestructuradas a 10 PM de software y encuesta a 89 participantes. La encuesta usó muestreo no probabilístico por conveniencia; priorizó problemas citados en al menos 3 entrevistas y midió frecuencia y severidad percibidas. | Identificó 95 problemas en siete áreas y evaluó 27. Los problemas reportados como más frecuentes incluyeron determinar el valor real que necesita el cliente, cambios frecuentes de estrategia/prioridades, deuda técnica, trabajo en silos y balancear trabajo reactivo y proactivo. | Estudia gestión de producto de software, no específicamente PO novatos ni banca. Frecuencia y severidad son percepciones; no miden horas ni resultados del producto. La encuesta no es representativa por su muestreo de conveniencia. |
| [Toward an Agile Product Management: What Do Product Managers Do in Agile Companies?](https://doi.org/10.1007/978-3-031-08169-9_11), 2022 | Estudio de casos múltiples con 17 entrevistas a 11 PM en cuatro empresas ágiles. | Los PM describen experimentación e innovación continua, apoyo a los equipos y actividades adicionales necesarias para el desarrollo de producto. | Muestra pequeña, no bancaria y centrada en PM, no en PO novatos; el estudio describe actividades, no cuantifica carga, tiempo de discovery ni impacto causal. |
| [Strategies for Dealing With Software Product Management Challenges](https://doi.org/10.1109/access.2023.3282605), 2023, *IEEE Access* | 47 PM participaron en 15 grupos focales; después se aplicó una encuesta para valorar comprensión y efectividad percibida de las soluciones. | Propone 39 soluciones y guías para los cinco problemas más comunes identificados en trabajo previo. | Las soluciones se valoran en discusión/encuesta; el resumen no reporta una intervención longitudinal que demuestre mejoras de tiempo o desempeño. No es específica de banca ni de PO con poca experiencia. |

**Lectura para la oportunidad:** hay convergencia externa con dos tensiones relevantes para el contexto que aportas: comprender el valor que busca el cliente y repartir el tiempo entre demandas reactivas y proactivas. Es evidencia de retos del rol en software, no una medición de su frecuencia en Banco Pichincha.

## 2. Cultura centrada en cliente y orientada a datos

| Fuente y fecha | Metodología | Resultados publicados | Limitaciones |
|---|---|---|---|
| [Digital Transformation in Banking: A Managerial Perspective on Barriers to Change](https://doi.org/10.3390/su13042032), 2021, *Sustainability* | Estudio cualitativo exploratorio: entrevistas contextuales a miembros de directorios de bancos alemanes, análisis inductivo de contenido y revisión de enfoques de buenas prácticas. El resumen consultado no especifica el número de entrevistados. | Identifica barreras en estrategia y gestión, tecnología y regulación, clientes y empleados, conocimiento de mercado y productos, participación de empleados/clientes y beneficio público. | Perspectiva de alta dirección, no de PO ni clientes; contexto alemán; cualitativo y no cuantifica prevalencia o impacto. El tamaño de la muestra no está disponible en el resumen revisado. |
| [A Customer-Driven Evaluation Method for Service Innovation in Banking](https://doi.org/10.1109/access.2023.3292123), 2023, *IEEE Access* | Desarrolla un modelo de evaluación multicriterio bajo incertidumbre con datos de encuestas a clientes y teoría de evidencia de Dempster-Shafer; lo ilustra empíricamente en tres bancos de Vietnam. | Muestra cómo evaluar innovación de servicios desde la perspectiva del cliente y comparar resultados entre bancos. | Evalúa un método de medición, no una cultura organizacional ni la ejecución de discovery. Tres bancos de un país; no establece que el método mejore rentabilidad, usabilidad o decisiones, y el resumen no indica el tamaño de las muestras. |
| [Big data analytics management capability and firm performance: the mediating role of data-driven culture](https://doi.org/10.1007/s11846-022-00596-8), 2022, *Review of Managerial Science* | Encuesta a 432 especialistas en big data de 132 empresas de Turquía. | Reporta asociaciones positivas de capacidad de gestión de analítica y cultura data-driven con desempeño operativo y financiero; la cultura media estadísticamente la relación entre capacidad analítica y desempeño. | Encuesta en un país y múltiples sectores, no PO ni banca. El diseño de encuesta no prueba causalidad; estudia relaciones de desempeño, no dificultades concretas de discovery o alfabetización de datos individual. |
| [Big data analytics and firm performance: Findings from a mixed-method approach](https://doi.org/10.1016/j.jbusres.2019.01.044), 2019, *Journal of Business Research* | Encuesta a 175 CIO y responsables de TI de empresas griegas, análisis fsQCA y tres estudios de caso. | Encuentra cuatro configuraciones distintas de recursos analíticos asociadas con alto desempeño; los casos describen desafíos para orquestar esos recursos. Esto apunta a capacidades complementarias, no solo a disponer de herramientas o datos. | Empresas griegas y responsables de TI, no PO ni banca específicamente. Las configuraciones observadas no prueban causalidad y no miden habilidad individual para convertir datos en oportunidades de discovery. |
| [How Agile Practices Impact Customer Responsiveness and Development Success: A Field Study](https://doi.org/10.1177/875697281704800208), 2017, *Project Management Journal* | Estudio de campo en una organización grande sobre prácticas ágiles y respuesta al cliente. El resumen consultado no detalla el tamaño de la muestra. | Las prácticas ágiles pueden mejorar la efectividad o la eficiencia de la respuesta del equipo al cliente, pero no ambas simultáneamente; las prácticas estándar también se asociaron con éxito de desarrollo. | Un solo contexto organizacional; no estudia específicamente Product Discovery, banca ni IA. El resumen no permite evaluar la muestra ni la magnitud del efecto. |

**Lectura para la oportunidad:** los estudios bancarios describen barreras de conocimiento de mercado y participación; la investigación de analítica sugiere que el desempeño depende de combinar recursos y coordinación. La literatura revisada no demuestra específicamente una brecha individual de alfabetización de datos en PO bancarios. La cultura centrada en cliente y datos aparece como un problema organizacional además de una necesidad de herramientas.

## 3. IA generativa y agentes en investigación, análisis y producto

| Fuente y fecha | Metodología | Resultados publicados | Limitaciones |
|---|---|---|---|
| [Interview-Informed Generative Agents for Product Discovery: A Validation Study](https://doi.org/10.1145/3772318.3791918), CHI 2026 | Estudio de validación con entrevistas de flujos de trabajo a 51 trabajadores del conocimiento. Se crearon agentes personalizados y se compararon sus evaluaciones de cuatro conceptos de herramientas de IA para documentos con las respuestas de las mismas personas. | Los agentes fueron “distribution-calibrated but identity-imprecise”: aproximaron patrones agregados de respuesta, pero no reprodujeron confiablemente a cada individuo. Los autores consideran posible su uso para screening temprano de conceptos, no como sustituto de entrevistas auténticas. | Un dominio (flujos documentales con IA), cuatro conceptos y una muestra de knowledge workers, no clientes de banca. Evalúa simulación de respuestas, no tiempo ahorrado ni resultados de un proceso completo de investigación. |
| [Artificial Intelligence and Management: The Automation-Augmentation Paradox](https://doi.org/10.5465/amr.2018.0072), 2020, *Academy of Management Review* | Artículo conceptual que aplica teoría de paradojas a automatización y aumento de capacidades humanas. | Argumenta que ambas formas de uso pueden coexistir y que privilegiar solo una puede generar efectos negativos. | No es estudio de intervención ni mide resultados de Product Discovery, desempeño, rentabilidad o usabilidad. Sirve como marco, no como prueba de impacto. |

**Lectura para la oportunidad:** existe evidencia directa, todavía temprana, de agentes que sintetizan o simulan respuestas para explorar conceptos; su precisión agregada no equivale a comprensión individual del cliente. No se encontró evidencia sólida de agentes autónomos que completen discovery bancario de principio a fin ni de su efecto en tiempo o decisiones.

## 4. Reducciones de tiempo en actividades comparables

| Fuente y fecha | Metodología | Resultados publicados | Limitaciones |
|---|---|---|---|
| [Experimental evidence on the productivity effects of generative artificial intelligence](https://doi.org/10.1126/science.adh2586), 2023, *Science* | Experimento online preregistrado: 453 profesionales con educación universitaria realizaron tareas de escritura específicas de su ocupación; la mitad tuvo acceso a ChatGPT. | El tiempo promedio por tarea disminuyó 40% y la calidad evaluada del resultado aumentó 18%. | Tareas de escritura acotadas en un experimento online; no un proceso completo de discovery ni una medición en el lugar de trabajo. No permite convertir el efecto en horas por PO. |
| [Generative AI at Work](https://doi.org/10.1093/qje/qjae044), 2024, *Quarterly Journal of Economics* | Estudio de campo con introducción escalonada de un asistente conversacional de IA y datos de 5.172 agentes de servicio al cliente. Productividad medida como problemas resueltos por hora. | La productividad aumentó 15% en promedio. Los agentes menos experimentados o con menor habilidad mejoraron velocidad y calidad; los más experimentados tuvieron ganancias pequeñas de velocidad y una pequeña caída de calidad. También se reportaron mejores interacciones con clientes en algunos indicadores. | Una empresa y un flujo de soporte, no discovery. La introducción escalonada no es un experimento aleatorio individual; problemas resueltos por hora no equivale a horas ahorradas por tarea de discovery. Los efectos difieren por experiencia. |
| [Navigating the Jagged Technological Frontier: Field Experimental Evidence of the Effects of Artificial Intelligence on Knowledge Worker Productivity and Quality](https://doi.org/10.1287/orsc.2025.21838), 2026, *Organization Science* | Experimento preregistrado con 758 trabajadores del conocimiento en colaboración con BCG: sin IA, GPT-4 y GPT-4 más una breve orientación de prompting; tareas de consultoría realistas, 18 dentro de la frontera de capacidad observada y una seleccionada fuera. | En tareas dentro de la frontera, los participantes con IA completaron 12,2% más tareas y fueron 25,1% más rápidos, con calidad significativamente mayor. En una tarea fuera de la frontera, tuvieron 19% menos probabilidad de producir una respuesta correcta que el grupo sin IA. | Experimento con tareas diseñadas y participantes de consultoría; no despliegue longitudinal en banca. Demuestra que velocidad y calidad dependen de la tarea y de reconocer los límites del modelo; no es un pronóstico de ahorro para BP. |

**Interpretación del objetivo de cuatro horas:** estos resultados sustentan que algunas tareas cognitivas acotadas pueden acelerarse. No se suman ni se convierten a horas de discovery: los estudios usan tareas, poblaciones, herramientas y métricas distintas. Cuatro horas sigue siendo una hipótesis de valor a medir con el producto y una línea base local, no un efecto probado por esta revisión.

## 5. Prácticas de Product Discovery relevantes

| Fuente y fecha | Metodología / tipo de evidencia | Hallazgo o práctica | Limitaciones |
|---|---|---|---|
| [Phases, metrics, and techniques of product discovery](https://doi.org/10.1186/s13731-024-00454-9), 2025, *Journal of Innovation and Entrepreneurship* | Revisión y síntesis de literatura gris: artículos en línea, blogs, reportes y libros. | Organiza prácticas de discovery por fases, métricas y técnicas; puede servir como mapa de vocabulario y actividades. | La propia revisión reconoce que la literatura gris tiene menor rigor académico y pide más investigación revisada por pares. No valida frecuencia ni impacto de las prácticas. |
| [How the discovery phase works](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works), GOV.UK, publicada en 2016 | Guía oficial de práctica de servicios públicos; no es un estudio experimental. | Recomienda comprender usuarios y necesidades antes de decidir avanzar; discovery puede concluir que no conviene construir. Indica que no hay duración fija y que una fase suele tomar alrededor de 4–8 semanas. | Guía normativa de servicios públicos del Reino Unido, no evidencia de impacto en bancos. Las 4–8 semanas describen una fase de proyecto y no son un ahorro esperado ni una estimación para el trabajo semanal de un PO. |
| [Strategies for Dealing With Software Product Management Challenges](https://doi.org/10.1109/access.2023.3282605), 2023 | Síntesis profesional-académica basada en grupos focales y encuesta; ver sección 1. | Convertir problemas frecuentes en soluciones y guías explícitas para equipos de producto es un enfoque documentado; las guías pueden orientar procesos y roles. | Las soluciones no se probaron como intervención en bancos ni se midieron con resultados de negocio. |

### Principios derivados para orientar el diseño, no funcionalidades

1. Empezar por el problema, las necesidades y el valor para el cliente; permitir que la investigación concluya que no se debe construir.
2. Conectar evidencia cualitativa de clientes con datos y criterios explícitos de decisión. No asumir que la herramienta por sí sola crea cultura o capacidad analítica.
3. Hacer visible la incertidumbre: separar observaciones, hipótesis, interpretación y decisión; validar oportunidades con experimentos antes de escalar.
4. Usar IA como apoyo a tareas y síntesis con puntos de revisión humana. No presentar respuestas simuladas como evidencia de clientes reales.
5. Medir por separado tiempo, calidad de evidencia y resultados para el cliente; segmentar resultados por experiencia, ya que estudios de campo muestran efectos heterogéneos.
6. Tratar privacidad, consentimiento, trazabilidad y controles de datos como restricciones de diseño por confirmar con los responsables internos de banca. Esta es una **suposición de diseño/regulatoria**, no un hallazgo de las fuentes anteriores.

## Síntesis: evidencia, inferencias y supuestos

### Evidencia publicada

- En software product management, entender el valor que necesita el cliente y equilibrar trabajo reactivo y proactivo figuran entre los problemas percibidos como más frecuentes.
- En estudios bancarios se describen barreras organizacionales de conocimiento de mercado y participación de clientes/empleados; una evaluación multicriterio basada en encuestas es una forma documentada de estructurar la mirada del cliente.
- Estudios experimentales y de campo encuentran mejoras de velocidad/productividad con IA en tareas acotadas, pero los efectos de calidad varían por tarea y experiencia.
- En discovery, los agentes generativos evaluados pueden aproximar patrones agregados, pero no representar con fidelidad a cada individuo.

### Inferencias para BP

- Las observaciones internas del usuario son consistentes con problemas descritos en literatura de producto y banca, aunque las fuentes externas no permiten medir su frecuencia o severidad en Banco Pichincha.
- Una oportunidad de diseño puede estar en hacer el discovery más practicable dentro de la carga existente, conectar señales de cliente y datos, y estructurar decisiones; qué actividad conviene facilitar primero sigue abierto.
- IA puede reducir esfuerzo en partes acotadas, pero la evidencia no permite asumir que automatizar discovery completo mejorará la calidad o la rentabilidad.

### Supuestos de diseño a validar

- El contexto interno aportado por el usuario refleja las necesidades actuales de los PO objetivo.
- El umbral de cuatro horas será un criterio de éxito del producto, no un resultado garantizado por estudios externos.
- Rentabilidad y usabilidad son los resultados de calidad prioritarios; habrá que operacionalizarlos al diseñar y evaluar el MVP.
- Los principios enumerados arriba son criterios de diseño candidatos, no funcionalidades ya decididas.

## Vacíos que permanecen

- Pocos estudios examinan PO novatos o PO de bancos de tamaño cercano a 7.000 colaboradores.
- No se identificó un estudio que mida discovery bancario con IA y agentes de principio a fin, y que reporte conjuntamente tiempo, usabilidad y rentabilidad.
- La evidencia sobre cultura de datos es organizacional y general; no mide la habilidad de los PO de BP para convertir datos en oportunidades.
- No hay evidencia externa suficiente para atribuir rentabilidad a una práctica específica de Product Discovery.

## Referencias principales

Los enlaces de cada fuente en las tablas llevan al DOI o a la guía original. Las metodologías, muestras y limitaciones están resumidas junto a cada hallazgo para que la conclusión no dependa del título o de afirmaciones promocionales.