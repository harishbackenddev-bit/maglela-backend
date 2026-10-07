/** Every service module loads (imports resolve, no top-level crash) and exports only functions. */
import { describe, it, expect } from "vitest";

const modules = import.meta.glob("../../src/services/**/*.ts", { eager: true });

describe("services load", () => {
  const entries = Object.entries(modules).map(([f, m]) => [f.replace("../../src/services/", ""), m] as const);
  it("finds the service modules", () => expect(entries.length).toBeGreaterThanOrEqual(13));

  it.each(entries)("%s exports functions", (_f, mod) => {
    const exports = Object.entries(mod as Record<string, unknown>).filter(([k]) => k !== "default");
    expect(exports.length).toBeGreaterThan(0);
    for (const [name, value] of exports) {
      if (name === "PRODUCT_PDF_MAP" || name === "TOOLKIT_PDF_MAP") continue; // data tables
      expect(typeof value, name).toBe("function");
    }
  });
});

describe("all route files, controllers, models and utils import cleanly", () => {
  const all = {
    ...import.meta.glob("../../src/routes/**/*.ts", { eager: true }),
    ...import.meta.glob("../../src/controllers/**/*.ts", { eager: true }),
    ...import.meta.glob("../../src/models/**/*.ts", { eager: true }),
    ...import.meta.glob("../../src/utils/**/*.{ts,tsx}", { eager: true }),
    ...import.meta.glob("../../src/config/**/*.ts", { eager: true }),
  };
  it("has loaded a lot of modules", () => expect(Object.keys(all).length).toBeGreaterThan(45));
});
