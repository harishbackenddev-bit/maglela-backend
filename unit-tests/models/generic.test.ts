
import { describe, it, expect } from "vitest";
import { allModels } from "./helpers";

const models = allModels();

it("discovers all models", () => expect(models.length).toBeGreaterThanOrEqual(19));

describe.each(models.map((m) => [m.file, m] as const))("%s", (_f, { model }) => {
  const paths = Object.entries<any>(model.schema.paths).filter(([p]) => !["_id", "__v"].includes(p));

  it("has a collection name and model name", () => {
    expect(model.modelName).toBeTruthy();
    expect(model.collection.name).toBeTruthy();
  });

  const required = paths.filter(([, t]) => t.options?.required && t.options.default === undefined && t.instance !== "Embedded" && !t.path.includes("."));
  it("an empty document reports every required top-level field (without default)", () => {
    const err = new model({}).validateSync();
    const missing = Object.keys(err?.errors ?? {});
    for (const [p] of required) expect(missing, `${p} should be required`).toContain(p);
  });

  const enums = paths.filter(([, t]) => Array.isArray(t.enumValues) && t.enumValues.length && t.instance === "String");
  it.each(enums.map(([p, t]) => [p, t] as const))("enum %s rejects an unknown value", (p) => {
    const err = new model({ [p]: "__not_a_valid_value__" }).validateSync();
    expect(err?.errors[p], p).toBeDefined();
  });
  it.each(enums.map(([p, t]) => [p, t] as const))("enum %s accepts every declared value", (p, t) => {
    for (const v of t.enumValues) {
      const err = new model({ [p]: v }).validateSync();
      expect(err?.errors[p], `${p}=${v}`).toBeUndefined();
    }
  });

  const defaults = paths.filter(([, t]) => t.options?.default !== undefined && typeof t.options.default !== "function");
  it.each(defaults.map(([p, t]) => [p, t] as const))("default for %s is applied", (p, t) => {
    const doc: any = new model({});
    const got = doc.get(p);
    const expected = t.options.default;
    const strip = (v: any): any => Array.isArray(v) ? v.map(strip) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "_id").map(([k, x]) => [k, strip(x)])) : v;
    expect(got === undefined ? undefined : strip(JSON.parse(JSON.stringify(got)))).toEqual(expected);
  });

  const unique = paths.filter(([, t]) => t.options?.unique);
  it.each(unique.map(([p]) => [p] as const))("unique field %s has a unique index", (p) => {
    const idx = model.schema.indexes().some(([f, o]: any) => f[p] && o?.unique);
    expect(idx, p).toBe(true);
  });
});
