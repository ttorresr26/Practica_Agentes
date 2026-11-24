# Aplicación de estilo visual de Banco Pichincha

## Intención

Acercar la presentación de Discovery AI Assistant a la identidad visual pública de Banco Pichincha, atendiendo la solicitud de usar esa marca como referencia para colores y formas. No se recibió un moodboard; esta es una aproximación basada en el sitio y el logotipo públicos.

## Objetivos y límites

- Aplicar la paleta y los tratamientos de forma a toda la interfaz existente: formulario, progreso, resultados y aclaraciones.
- Conservar la estructura, el contenido, la interacción responsive y todas las funciones del asistente.
- Reemplazar el verde de marca actual por azul marino `#0F265C` y amarillo `#FFDD00`, obtenidos del logotipo oficial. Usar azul marino para texto/acciones y amarillo con texto azul para acentos destacados.
- Unificar las esquinas en torno a controles de 8 px y tarjetas de 16–20 px; reservar una esquina asimétrica como acento visual y no aplicarla indiscriminadamente.
- Conservar colores semánticos de error y advertencia, con contraste legible.
- No copiar ni incorporar el logotipo oficial, no añadir dependencias y no cambiar endpoints, cálculos o lógica.

## Alternativas consideradas

- Aplicar la paleta y las formas del sitio a la interfaz actual. **Elegida por el usuario**: mejora la coherencia visual con bajo riesgo funcional.
- Rediseñar la composición como un portal bancario: se descarta porque ampliaría el alcance y podría alterar el flujo de Discovery.

## Referencias públicas consultadas

- Sitio público: https://www.pichincha.com/
- Logotipo enlazado desde el sitio: https://www.pichincha.com/themes/custom/pichincha_theme/logo.svg

## Diseño

Actualizar los tokens y reglas globales existentes de `src/app/globals.css`, manteniendo una sola fuente de estilos. Aplicar los nuevos tokens a componentes actuales y revisar la respuesta responsive, sin cambiar sus estructuras JSX salvo que un ajuste de forma requiera una clase existente.

## Verificación

Ejecutar pruebas, lint y compilación de producción; comprobar estilos globales, formulario, resultados y preguntas aclaratorias en tamaños de escritorio y móvil.
