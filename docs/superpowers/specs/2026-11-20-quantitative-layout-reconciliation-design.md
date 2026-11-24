# Corrección de gráficos cuantitativos y explicación de conciliación

## Intención

Mantener legibles los gráficos cuantitativos en tarjetas estrechas y hacer verificable la discrepancia del XLSX sintético sin alterar ni completar sus datos.

## Diagnóstico confirmado

- `SegmentBars` y la distribución de tiempos ya producen cuatro celdas por fila: etiqueta, barra, porcentaje y cantidad. Las columnas CSS actuales tienen mínimos fijos que, junto con el padding y los gaps de las tarjetas, exceden el ancho interior. Los comparativos permanecen en dos columnas hasta un breakpoint demasiado estrecho; títulos, etiquetas y textos de tendencia/asociación tampoco fuerzan ajuste dentro del contenedor.
- El cálculo convierte `mayor_15_min` inclusivo en rangos exclusivos restando `mayor_60_min` para 15–60 y contabilizando >60 una sola vez. La suma resultante es 96.111 frente a 97.200 declaradas.
- Las 12 filas del archivo sintético se reciben y utilizan; no se omiten ni se duplican. Las discrepancias de sus filas suman 1.089. Todos los porcentajes usan 97.200 como denominador. La diferencia existe en los datos fuente; no se corregirá artificialmente.

## Objetivos y límites

- Adaptar las cuatro columnas existentes con `minmax(0, ...)`, alineación derecha de porcentajes/cantidades, ajuste de texto y apilado en pantallas estrechas.
- Evitar que comparativos, tendencia y asociación fuercen el ancho de las tarjetas.
- Distinguir una fila con rangos que no concilian (`UNRECONCILED_TIME_BUCKETS`) de una violación del subconjunto anidado (`INCONSISTENT_TIME_BUCKETS`).
- Explicar suma, total declarado, cantidad de filas afectadas y tratamiento de `mayor_60_min`.
- Mantener contadores y denominadores de origen; no imputar el saldo ni modificar los indicadores.
- Conservar la identidad visual y todas las métricas y visualizaciones.

## Alternativas consideradas

- Ajustar la grilla CSS de las cuatro celdas existentes y conservar el markup. **Elegida por el usuario**: satisface el responsive con menor riesgo.
- Reestructurar cada fila con nuevos envoltorios para las métricas. Se descarta porque las celdas existentes ya están separadas.

## Diseño

Actualizar `QuantitativeInsights`, `calculations.ts`, el esquema de respuesta y `globals.css`, con pruebas sobre el XLSX sintético y el contrato de layout. Mantener sin cambios la aritmética de los rangos y porcentajes.

## Verificación

Probar los 12 registros, la diferencia acumulada de 1.089, el cero de registros omitidos y duplicados, el denominador de los porcentajes, y el texto de conciliación. Verificar reglas de ancho flexible, alineación, ajuste de texto y breakpoint responsive; ejecutar pruebas, lint y build.
