import { posix as path } from "node:path";
import JSZip from "jszip";

function stripSpreadsheetElementPrefixes(xml: string) {
  const prefixes = new Set(
    [...xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main\2/g)]
      .map((match) => match[1]),
  );
  let normalized = xml;

  for (const prefix of prefixes) {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(
      new RegExp(`(<\\/?)(?:${escapedPrefix}):(?=[A-Za-z_])`, "g"),
      "$1",
    );
  }

  return normalized;
}

function normalizeRelationshipTargets(xml: string, relationshipPath: string) {
  const match = relationshipPath.match(/^(.*\/)_rels\/([^/]+)\.rels$/);
  if (!match) return xml;

  const sourcePart = `${match[1]}${match[2]}`;
  const sourceDirectory = path.dirname(sourcePart);
  return xml.replace(
    /(\bTarget\s*=\s*)(["'])\/xl\/([^"']+)\2/g,
    (_match, attribute: string, quote: string, target: string) => {
      const relativeTarget = path.relative(sourceDirectory, `xl/${target}`);
      return `${attribute}${quote}${relativeTarget}${quote}`;
    },
  );
}

export async function normalizeXlsxPackage(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer);

  for (const entry of Object.values(archive.files)) {
    if (entry.dir || !entry.name.startsWith("xl/")) continue;
    if (!entry.name.endsWith(".xml") && !entry.name.endsWith(".rels")) continue;

    let content = await entry.async("string");
    content = entry.name.endsWith(".rels")
      ? normalizeRelationshipTargets(content, entry.name)
      : stripSpreadsheetElementPrefixes(content);
    archive.file(entry.name, content);
  }

  return archive.generateAsync({ type: "nodebuffer" });
}
