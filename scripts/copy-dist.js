import { cpSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "frontend", "dist", "frontend", "browser");
const target = join(root, "backend", "public");

if (!existsSync(source)) {
  console.error(`Angular build output not found at ${source}. Run the frontend build first.`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Copied Angular build → ${target}`);
