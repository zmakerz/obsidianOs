import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "AGENTS.md",
  "PROJECT.md",
  "ACTIVE.md",
  "config/ai/models.yaml",
  "packages/kernel/src/approval.ts",
  "packages/kernel/src/operating-loop.ts",
  "packages/knowledge/src/promotion.ts",
  "packs/marketing/src/geo-aeo.ts",
  "vault/README.md",
];

for (const path of required) await access(resolve(root, path));

const checked = ["README.md", "PROJECT.md", "ACTIVE.md", "docs/SECURITY.md", "config/ai/models.yaml"];
const forbidden = [
  /apify_api_[A-Za-z0-9_-]{12,}/,
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9._-]{24,}/,
];

for (const path of checked) {
  const content = await readFile(resolve(root, path), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error(`Potential secret detected in ${path}`);
  }
}

console.log(`Structure verified: ${required.length} required paths, no obvious secrets.`);
