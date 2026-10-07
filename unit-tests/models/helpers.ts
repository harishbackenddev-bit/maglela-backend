import { Model } from "mongoose";

/** Run the schema's `pre('save')` hooks (incl. mongoose's own validation) WITHOUT a database. */
export const runPreSave = (doc: any): Promise<void> =>
  new Promise((resolve, reject) => {
    doc.$__schema.s.hooks.execPre("save", doc, [], (err: any) => (err ? reject(err) : resolve()));
  });

export const modelsGlob = import.meta.glob("../../src/models/**/*.ts", { eager: true });

export const allModels = (): { file: string; exportName: string; model: Model<any> }[] => {
  const out: any[] = [];
  for (const [file, mod] of Object.entries(modelsGlob)) {
    for (const [exportName, v] of Object.entries(mod as any)) {
      const m: any = v;
      if (m && m.schema && m.modelName) out.push({ file: file.replace("../../src/models/", ""), exportName, model: m });
    }
  }
  return out;
};
