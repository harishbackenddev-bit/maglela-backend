import fs from "fs";
import path from "path";



const dir = path.resolve(process.cwd(), "public");
export default function setup() {
  const existed = fs.existsSync(dir);
  return () => {
    if (!existed) fs.rmSync(dir, { recursive: true, force: true });
  };
}
