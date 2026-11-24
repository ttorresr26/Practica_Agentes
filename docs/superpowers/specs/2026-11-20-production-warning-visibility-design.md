# Ocultamiento de advertencias detalladas en producción

## Intención

Evitar que la interfaz desplegada muestre la lista de advertencias de calidad que identifica cada archivo, hoja/fila y discrepancia. En desarrollo, la lista seguirá disponible para facilitar diagnóstico.

## Objetivos y límites

- En producción, ocultar solo la lista detallada de `analysis.warnings`.
- Mantener los indicadores, hallazgos y avisos agregados de calidad, incluida la diferencia total no conciliada.
- No cambiar los cálculos, las advertencias del servidor ni el contrato/respuesta de la API; los detalles seguirán disponibles en la respuesta de red.
- No cambiar la interfaz fuera de ese bloque ni introducir configuración adicional.

## Alternativas consideradas

- Ocultar la lista únicamente en la interfaz según `NODE_ENV`: conserva la respuesta y el diagnóstico disponibles en el servidor/red. **Elegida por el usuario** para este cambio.
- Excluir los detalles también de la respuesta API en producción: evita su exposición en la red, pero altera el contrato recibido por el cliente y no fue el alcance elegido.

## Diseño

En `QuantitativeInsights`, renderizar la lista de advertencias por archivo/fila solo cuando `NODE_ENV` no sea `production`. El resto de la sección cuantitativa permanece sin cambios.

## Verificación

Añadir una prueba que confirme que la lista aparece en desarrollo y no aparece con `NODE_ENV=production`; ejecutar las pruebas enfocadas, lint y compilación de producción.
