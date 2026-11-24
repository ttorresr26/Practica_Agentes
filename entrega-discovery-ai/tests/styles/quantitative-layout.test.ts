import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("quantitative chart layout", () => {
  it("uses shrinkable columns, wrapped metrics, and narrow-screen layouts", async () => {
    const css = await readFile(join(process.cwd(), "src/app/globals.css"), "utf8");
    const barRowCss = css.match(/\.quant-bar-row\s*\{([^}]*)\}/s)?.[1] ?? "";
    const barLabelCss = css.match(/\.quant-bar-label\s*\{([^}]*)\}/s)?.[1] ?? "";
    const chartGridCss = css.match(/\.quant-chart-grid\s*\{([^}]*)\}/s)?.[1] ?? "";
    const associationCss = css.match(/\.quant-association\s*\{([^}]*)\}/s)?.[1] ?? "";

    expect(barRowCss).toMatch(/grid-template-columns:[^;]*minmax\(0,/);
    expect(barLabelCss).toMatch(/min-width:\s*0/);
    expect(barLabelCss).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.quant-bar-row strong\s*\{[^}]*text-align:\s*right/s);
    expect(css).toMatch(/\.quant-bar-row small\s*\{[^}]*text-align:\s*right/s);
    expect(chartGridCss).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.quant-chart-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*600px\)\s*\{[\s\S]*?\.quant-bar-row\s*\{[^}]*grid-template-areas:[^}]*"label percentage"[^}]*"track count"/s);
    expect(associationCss).toMatch(/min-width:\s*0/);
    expect(css).toMatch(/\.quant-association strong,\s*\.quant-association span,[\s\S]*?\{[^}]*overflow-wrap:\s*anywhere/s);
    expect(css).toMatch(/\.quant-trend p\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });
});
