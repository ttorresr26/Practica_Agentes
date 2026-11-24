# Discovery AI Assistant

Prototipo en español para ayudar a Product Owners a pasar de una demanda a una comprensión más clara del problema del cliente, organizar evidencia y decidir el siguiente paso de descubrimiento.

## Requisitos

- Node.js `>=22.13.0` o `>=24`.
- npm `>=10`.

La aplicación inicia en modo simulado por defecto. No requiere claves de API, servicios de pago, base de datos ni conexiones corporativas.

## Instalar y ejecutar

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000`. En GitHub Codespaces, abre **Ports**, busca el puerto `3000` y selecciona **Open in Browser**.

No necesitas crear `.env.local` para usar el modo predeterminado. `.env.example` documenta los valores. Para una ejecución opcional con OpenAI, copia ese archivo a `.env.local`, define `AI_PROVIDER=openai`, `OPENAI_API_KEY` y `OPENAI_MODEL`. Esas variables se leen solo en el servidor; nunca agregues credenciales al navegador ni las publiques. Configurar OpenAI puede enviar la demanda y el texto de fuentes a ese proveedor. El flujo cuantitativo y el reprocesamiento de aclaraciones permanecen en modo simulado.

## Verificaciones

```bash
npm test
npm run lint
npm run build
```

Para servir la compilación de producción:

```bash
npm run start
```

## Datos y limitaciones

Usa únicamente información ficticia, sintética, agregada o pública. No cargues datos reales de clientes ni información confidencial de Banco Pichincha. El filtro local de contenido sensible es de mejor esfuerzo; no es DLP ni garantiza anonimización.

Los archivos se procesan temporalmente en el servidor. No hay persistencia, OCR, conexiones corporativas ni llamadas externas en el modo predeterminado. Los cálculos cuantitativos de transferencias son deterministas y locales; el análisis cualitativo predeterminado usa reglas simuladas y debe identificarse como tal.

Consulta [handoff.md](./handoff.md) para el contexto, arquitectura, funcionalidades, pruebas y limitaciones del proyecto, y [docs/file-processing.md](./docs/file-processing.md) para los formatos, límites y flujo de procesamiento.
