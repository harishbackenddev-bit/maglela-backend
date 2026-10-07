import fs from "fs";
import path from "path";

// src/config/aimulterConfig.ts creates <project>/public/uploads/* when it is imported.
// Remove that folder after the run if the tests were the ones that created it.
const dir = path.resolve(process.cwd(), "public");
export default function setup() {
  const existed = fs.existsSync(dir);
  return () => {
    if (!existed) fs.rmSync(dir, { recursive: true, force: true });
  };
}
