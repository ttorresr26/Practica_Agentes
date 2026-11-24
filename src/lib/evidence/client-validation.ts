import {
  ALLOWED_EXTENSIONS,
  FORMAT_BY_EXTENSION,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_FILE_BYTES,
  SUPPORTED_MIME_TYPES,
} from "./limits";

export function getClientFileError(files: Pick<File, "name" | "size" | "type">[]) {
  if (files.length > MAX_FILES) return "Puedes adjuntar hasta 5 archivos por solicitud.";
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_FILE_BYTES) {
    return "El tamaño total de los archivos no puede superar 25 MB.";
  }

  for (const file of files) {
    const extension = ALLOWED_EXTENSIONS.find((item) => file.name.toLowerCase().endsWith(item));
    if (!extension) {
      return `El archivo ${file.name} no está en un formato admitido. Selecciona .xlsx, .csv, .pdf o .docx.`;
    }
    if (file.size === 0) return `El archivo ${file.name} está vacío.`;
    if (file.size > MAX_FILE_BYTES) return `El archivo ${file.name} supera el límite de 10 MB.`;

    const mimeType = file.type.split(";")[0].trim().toLowerCase();
    const format = FORMAT_BY_EXTENSION[extension];
    if (mimeType && !SUPPORTED_MIME_TYPES[format].includes(mimeType)) {
      return `El tipo de contenido de ${file.name} no coincide con su extensión.`;
    }
  }

  return null;
}
