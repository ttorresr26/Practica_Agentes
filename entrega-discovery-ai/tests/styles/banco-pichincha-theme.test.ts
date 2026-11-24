import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Banco Pichincha-inspired global theme", () => {
  it("uses the brand palette and shared shape tokens on primary UI elements", async () => {
    const css = await readFile(join(process.cwd(), "src/app/globals.css"), "utf8");
    const primaryButtonCss = css.match(/\.primary-button\s*\{([^}]*)\}/s)?.[1] ?? "";
    const brandMarkCss = css.match(/\.brand-mark\s*\{([^}]*)\}/s)?.[1] ?? "";
    const entryCardCss = css.match(/\.entry-card\s*\{([^}]*)\}/s)?.[1] ?? "";
    const analysisResultsCss = css.match(/\.analysis-results\s*\{([^}]*)\}/s)?.[1] ?? "";

    expect(css).toMatch(/--brand-navy:\s*#0F265C/i);
    expect(css).toMatch(/--brand-yellow:\s*#FFDD00/i);
    expect(primaryButtonCss).toMatch(/background:\s*var\(--brand-yellow\)/);
    expect(primaryButtonCss).toMatch(/color:\s*var\(--brand-navy\)/);
    expect(primaryButtonCss).toMatch(/border-radius:\s*var\(--radius-control\)/);
    expect(brandMarkCss).toMatch(/background:\s*var\(--brand-yellow\)/);
    expect(brandMarkCss).toMatch(/color:\s*var\(--brand-navy\)/);
    expect(entryCardCss).toMatch(/border-radius:\s*var\(--radius-card\)/);
    expect(analysisResultsCss).toMatch(/border-radius:\s*var\(--radius-card\)/);
  });
});
