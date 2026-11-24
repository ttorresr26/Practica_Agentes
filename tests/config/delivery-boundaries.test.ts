import { ESLint } from "eslint";
import { mkdir, mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("delivery package tooling boundaries", () => {
  it("keeps the nested delivery copy out of root TypeScript and ESLint checks", async () => {
    const deliveryDirectory = path.join(projectRoot, "entrega-discovery-ai");
    let createdDeliveryDirectory = false;
    try {
      await mkdir(deliveryDirectory);
      createdDeliveryDirectory = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }

    const probeDirectory = await mkdtemp(path.join(deliveryDirectory, "tooling-probe-"));
    const probePath = path.join(probeDirectory, "probe.ts");
    try {
      await writeFile(probePath, "export const probe = true;\n", "utf8");
      const configPath = path.join(projectRoot, "tsconfig.json");
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      expect(configFile.error).toBeUndefined();
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        projectRoot,
        undefined,
        configPath,
      );
      expect(parsedConfig.fileNames.map((file) => path.resolve(file))).not.toContain(
        path.resolve(probePath),
      );

      const eslint = new ESLint({ cwd: projectRoot });
      expect(await eslint.isPathIgnored(probePath)).toBe(true);
    } finally {
      await unlink(probePath);
      await rmdir(probeDirectory);
      if (createdDeliveryDirectory) await rmdir(deliveryDirectory);
    }
  });
});
