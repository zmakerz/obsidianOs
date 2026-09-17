import { readdir, readFile } from "node:fs/promises";
import { basename, extname, relative, resolve, sep } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const vaultRoot = resolve(projectRoot, "vault");
const requiredPaths = [
  "00_system/OPERATING_RULES.md",
  "00_system/templates/capture.md",
  "00_system/templates/knowledge.md",
  "00_system/templates/sop.md",
  "00_system/templates/daily-log.md",
  "40_navigation/HOME.md",
];
const allowedStatuses = new Set(["pending", "draft", "active", "deprecated", "archived"]);
const knowledgeKinds = new Set(["wiki", "sop", "output", "article"]);
const secretPatterns = [
  /apify_api_[A-Za-z0-9_-]{12,}/,
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9._-]{24,}/,
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function unquote(value) {
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return null;
  const normalized = content.replaceAll("\r\n", "\n");
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) return null;
  const result = {};
  let currentArray = null;
  for (const line of normalized.slice(4, end).split("\n")) {
    const keyMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (keyMatch) {
      const [, key, rawValue] = keyMatch;
      if (rawValue === "") {
        result[key] = [];
        currentArray = key;
      } else if (rawValue === "[]") {
        result[key] = [];
        currentArray = null;
      } else {
        result[key] = unquote(rawValue.trim());
        currentArray = null;
      }
      continue;
    }
    const itemMatch = line.match(/^\s+-\s+(.+)$/);
    if (itemMatch && currentArray) result[currentArray].push(unquote(itemMatch[1].trim()));
  }
  return result;
}

function normalizeName(value) {
  return value.replaceAll("\\", "/").replace(/\.md$/i, "").trim().toLocaleLowerCase("ko-KR");
}

const allFiles = await walk(vaultRoot);
const markdownFiles = allFiles.filter((file) => extname(file).toLowerCase() === ".md");
const errors = [];

for (const requiredPath of requiredPaths) {
  if (!markdownFiles.some((file) => relative(vaultRoot, file).replaceAll(sep, "/") === requiredPath)) {
    errors.push(`Missing required Vault file: ${requiredPath}`);
  }
}

const documents = [];
const resolvableNames = new Set();

for (const file of markdownFiles) {
  const path = relative(vaultRoot, file).replaceAll(sep, "/");
  const content = await readFile(file, "utf8");
  const isReadme = basename(file).toLowerCase() === "readme.md";
  const isTemplate = path.startsWith("00_system/templates/");
  const frontmatter = parseFrontmatter(content);

  if (!isReadme && !isTemplate) {
    if (!frontmatter) {
      errors.push(`${path}: missing valid frontmatter`);
    } else {
      for (const key of ["kind", "status", "created", "updated"]) {
        if (!frontmatter[key]) errors.push(`${path}: missing ${key}`);
      }
      if (frontmatter.status && !allowedStatuses.has(frontmatter.status)) {
        errors.push(`${path}: unsupported status ${frontmatter.status}`);
      }
      if (knowledgeKinds.has(frontmatter.kind)) {
        if (!frontmatter.domain) errors.push(`${path}: ${frontmatter.kind} requires domain`);
        if (!Array.isArray(frontmatter.source_refs) || frontmatter.source_refs.length === 0) {
          errors.push(`${path}: ${frontmatter.kind} requires source_refs`);
        }
      }
    }
  }

  const relativeWithoutExtension = path.replace(/\.md$/i, "");
  resolvableNames.add(normalizeName(relativeWithoutExtension));
  resolvableNames.add(normalizeName(basename(file, extname(file))));
  if (Array.isArray(frontmatter?.aliases)) {
    for (const alias of frontmatter.aliases) resolvableNames.add(normalizeName(alias));
  }
  documents.push({ path, content, frontmatter, isReadme, isTemplate });
}

let linkCount = 0;
const inboundLinks = new Map();
for (const document of documents) {
  const searchable = document.content.replace(/```[\s\S]*?```/g, "");
  for (const match of searchable.matchAll(/\[\[([^\]]+)\]\]/g)) {
    linkCount += 1;
    const target = match[1].split("|")[0].split("#")[0].trim();
    const normalized = normalizeName(target);
    if (!resolvableNames.has(normalized)) {
      errors.push(`${document.path}: unresolved Wiki Link [[${target}]]`);
    } else {
      inboundLinks.set(normalized, (inboundLinks.get(normalized) ?? 0) + 1);
    }
  }
}

for (const document of documents) {
  if (document.isTemplate) continue;
  if (!knowledgeKinds.has(document.frontmatter?.kind)) continue;
  const fileName = normalizeName(basename(document.path, ".md"));
  const aliases = Array.isArray(document.frontmatter.aliases) ? document.frontmatter.aliases.map(normalizeName) : [];
  const hasInbound = (inboundLinks.get(normalizeName(document.path)) ?? 0) > 0 || (inboundLinks.get(fileName) ?? 0) > 0 || aliases.some((alias) => (inboundLinks.get(alias) ?? 0) > 0);
  if (!hasInbound) errors.push(`${document.path}: no inbound Wiki Link from HOME or another document`);
}

for (const file of allFiles) {
  const path = relative(vaultRoot, file).replaceAll(sep, "/");
  if (/\.(png|jpe?g|gif|webp|pdf|zip|mp[34])$/i.test(path)) continue;
  const content = await readFile(file, "utf8").catch(() => "");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) errors.push(`${path}: potential secret detected`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  throw new Error(`Vault lint failed with ${errors.length} issue(s).`);
}

console.log(`Vault lint passed: ${markdownFiles.length} Markdown files, ${linkCount} Wiki Links.`);
