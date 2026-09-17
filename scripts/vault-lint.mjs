import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { basename, extname, isAbsolute, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { isMap, parseDocument } from "yaml";

const defaultVault = resolve(import.meta.dirname, "../vault");
const defaultRequiredPaths = [
  "00_system/OPERATING_RULES.md", "00_system/templates/capture.md",
  "00_system/templates/knowledge.md", "00_system/templates/sop.md",
  "00_system/templates/daily-log.md", "40_navigation/HOME.md",
];
const statuses = new Set(["pending", "draft", "active", "deprecated", "archived"]);
const knowledgeKinds = new Set(["wiki", "sop", "article", "output"]);
const ignoredDirectories = new Set([".obsidian", ".git", ".trash", "node_modules"]);
const secretPatterns = [
  /apify_api_[A-Za-z0-9_-]{12,}/,
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9._-]{24,}/,
];
const textExtensions = new Set([".md", ".txt", ".yaml", ".yml", ".json", ".csv", ".js", ".mjs", ".ts", ".html", ".css"]);

function text(value) { return typeof value === "string" && value.trim().length > 0; }
function normalize(value) { return value.normalize("NFC").toLowerCase(); }
function within(root, path) {
  const part = relative(root, path);
  return part !== ".." && !part.startsWith(".." + sep) && !isAbsolute(part);
}
function validDate(value) {
  if (!text(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function frontmatter(content, report) {
  const normalized = content.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  const opening = /^---[ \t]*\n/.exec(normalized);
  if (!opening) return { metadata: null, body: normalized };
  const rest = normalized.slice(opening[0].length);
  const closing = /^---[ \t]*(?:\n|$)/m.exec(rest);
  if (!closing) { report("unclosed frontmatter"); return { metadata: null, body: "" }; }
  const yaml = rest.slice(0, closing.index);
  const body = rest.slice(closing.index + closing[0].length);
  if (Buffer.byteLength(yaml, "utf8") > 65536) { report("frontmatter exceeds 64 KiB"); return { metadata: null, body }; }
  try {
    const doc = parseDocument(yaml, { prettyErrors: false, uniqueKeys: true, stringKeys: true, version: "1.2" });
    const issues = [...doc.errors, ...doc.warnings];
    if (issues.length) {
      // Error codes only: YAML diagnostics must not echo source text or secrets.
      report("invalid YAML (" + [...new Set(issues.map(issue => issue.code))].join(", ") + ")");
      return { metadata: null, body };
    }
    if (!isMap(doc.contents)) { report("frontmatter must be a YAML mapping"); return { metadata: null, body }; }
    return { metadata: doc.toJS({ maxAliasCount: 25 }), body };
  } catch {
    report("invalid or excessive YAML aliases");
    return { metadata: null, body };
  }
}

function validateMetadata(doc, ids, report) {
  const m = doc.metadata;
  if (doc.isTemplate) return;
  if (!m) {
    if (!doc.isReadme) report("missing valid frontmatter");
    return;
  }
  for (const key of doc.isReadme ? [] : ["kind", "status", "created", "updated"]) {
    if (!Object.hasOwn(m, key) || !text(m[key])) report(key + " must be nonempty text");
  }
  if (text(m.kind) && !/^[a-z][a-z0-9-]*$/.test(m.kind)) report("kind must be a lowercase identifier");
  if (text(m.status) && !statuses.has(m.status)) report("unsupported status");
  for (const key of doc.isReadme ? ["created", "updated"].filter(key => Object.hasOwn(m, key)) : ["created", "updated"]) {
    if (!validDate(m[key])) report(key + " must be a real YYYY-MM-DD date");
  }
  const needsSources = knowledgeKinds.has(m.kind) || m.kind === "promotion-request";
  if ((needsSources || m.kind === "capture-request") && !text(m.domain)) report("kind requires a nonempty domain");
  if (needsSources || Object.hasOwn(m, "source_refs")) {
    if (!Array.isArray(m.source_refs) || m.source_refs.some(value => !text(value)) || (needsSources && !m.source_refs.length)) {
      report("source_refs must be a list of nonempty strings" + (needsSources ? " with at least one source" : ""));
    }
  }
  if (m.kind === "promotion-request" && !["article", "wiki", "sop"].includes(m.proposed_kind)) {
    report("promotion-request requires proposed_kind article, wiki or sop");
  }
  if (Object.hasOwn(m, "aliases") && (!Array.isArray(m.aliases) || m.aliases.some(value => !text(value)))) {
    report("aliases must be a list of nonempty strings");
  }
  if (Object.hasOwn(m, "id")) {
    if (!text(m.id)) report("id must be nonempty text");
    else if (ids.has(m.id.trim())) report("duplicate id; also used by " + ids.get(m.id.trim()));
    else ids.set(m.id.trim(), doc.path);
  }
}

// Ignore prose examples in fenced blocks and comments without changing line layout.
function visibleBlocks(body) {
  const uncommented = body.replace(/<!--[\s\S]*?-->|%%[\s\S]*?%%/g, value => value.replace(/[^\n]/g, " "));
  let fence = null;
  return uncommented.split("\n").map(line => {
    const marker = /^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      return "";
    }
    if (marker) { fence = { char: marker[1][0], length: marker[1].length }; return ""; }
    return line;
  }).join("\n");
}

function withoutInlineCode(body) {
  return body.replace(/(\x60+)([\s\S]*?)\1(?!\x60)/g, value => value.replace(/[^\n]/g, " "));
}

function headingText(value) {
  return normalize(value.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label ?? target)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, "")
    .replace(/(\x60+)(.*?)\1/g, "$2")
    .replace(/(\*\*|__|~~)(?=\S)(.*?\S)\1/g, "$2")
    .replace(/\*(?=\S)(.*?\S)\*/g, "$1")
    .replace(/(^|[\s(])_(?=\S)(.*?\S)_(?=$|[\s).,!?:])/g, "$1$2")
    .replace(/\\([\\*_~\x60])/g, "$1").trim());
}

function anchors(body) {
  const blocks = visibleBlocks(body);
  const headings = [];
  const stack = [];
  const lines = blocks.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const atx = /^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/.exec(lines[index]);
    const setext = index > 0 && /^ {0,3}(=+|-+)[ \t]*$/.exec(lines[index]);
    let level, title;
    if (atx) { level = atx[1].length; title = atx[2].replace(/[ \t]+#+[ \t]*$/, ""); }
    else if (setext && lines[index - 1].trim()) { level = setext[1][0] === "=" ? 1 : 2; title = lines[index - 1]; }
    else continue;
    while (stack.length && stack.at(-1).level >= level) stack.pop();
    stack.push({ level, title: headingText(title) });
    headings.push(stack.map(item => item.title));
  }
  const blocksIds = new Set([...withoutInlineCode(blocks).matchAll(/(?:^|[ \t])\^([A-Za-z0-9-]+)[ \t]*$/gm)].map(match => match[1]));
  return { headings, blocks: blocksIds };
}

function wikiLinks(body) {
  const searchable = withoutInlineCode(visibleBlocks(body));
  const found = [];
  for (const match of searchable.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    let backslashes = 0;
    for (let index = match.index - 1; index >= 0 && searchable[index] === "\\"; index -= 1) backslashes += 1;
    if (backslashes % 2) continue;
    found.push(match[1].split("|")[0].trim());
  }
  return found;
}

function lookup(target, current, fileIndex) {
  const hash = target.indexOf("#");
  const pathPart = (hash < 0 ? target : target.slice(0, hash)).replaceAll("\\", "/");
  const fragment = hash < 0 ? null : target.slice(hash + 1);
  if (!pathPart) {
    if (fragment === null) return { error: "empty Wiki Link target" };
    return { path: current, fragment };
  }
  if (/^[A-Za-z]:|^[a-z]+:\/\//i.test(pathPart)) return { error: "Wiki Link must target a Vault file" };
  let candidates;
  if (pathPart.includes("/")) {
    const resolved = posix.normalize(/^\.{1,2}\//.test(pathPart) ? posix.join(posix.dirname(current), pathPart) : pathPart.replace(/^\/+/, ""));
    if (resolved === ".." || resolved.startsWith("../")) return { error: "Wiki Link escapes Vault" };
    candidates = [...(fileIndex.byPath.get(normalize(resolved)) ?? []), ...(fileIndex.byPath.get(normalize(resolved + ".md")) ?? [])];
  } else {
    // Never guess between duplicate basenames or use aliases as evidence of a file.
    candidates = fileIndex.byName.get(normalize(pathPart)) ?? [];
  }
  if (!candidates.length) return { error: "unresolved Wiki Link" };
  if (candidates.length > 1) return { error: "ambiguous Wiki Link; use full file path" };
  return { path: candidates[0], fragment };
}

function hasAnchor(doc, fragment) {
  if (fragment.startsWith("^")) return doc.anchors.blocks.has(fragment.slice(1));
  const parts = fragment.split("#").map(headingText);
  if (parts.some(part => !part)) return false;
  return doc.anchors.headings.some(chain => parts.length <= chain.length
    && parts.every((part, index) => part === chain[chain.length - parts.length + index]));
}

export async function lintVault(vaultPath, options = {}) {
  const errors = [];
  const files = [];
  const documents = new Map();
  const ids = new Map();
  const requiredPaths = options.requiredPaths ?? defaultRequiredPaths;
  const home = options.home ?? "40_navigation/HOME.md";
  let root;
  try {
    root = await realpath(vaultPath);
    if (!(await lstat(root)).isDirectory()) throw new Error("Not a directory");
  } catch {
    return { errors: ["Vault is missing, unreadable or not a directory"], markdownCount: 0, linkCount: 0, reachableKnowledgeCount: 0 };
  }

  async function walk(directory) {
    let entries;
    try {
      if (!within(root, await realpath(directory)) || (await lstat(directory)).isSymbolicLink()) throw new Error("Directory left Vault");
      entries = await readdir(directory, { withFileTypes: true });
    }
    catch { errors.push(relative(root, directory) + ": cannot read directory"); return; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = resolve(directory, entry.name);
      const path = relative(root, absolute).split(sep).join("/");
      if (ignoredDirectories.has(entry.name)) continue;
      if (entry.isSymbolicLink()) { errors.push(path + ": symlinks are not inspected; use files inside the Vault"); continue; }
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.push(path);
    }
  }
  await walk(root);
  for (const path of requiredPaths) if (!files.includes(path)) errors.push("Missing required Vault file: " + path);
  const canonicalPaths = new Map();
  const fileIndex = { byPath: new Map(), byName: new Map() };
  function indexFile(map, key, path) {
    const existing = map.get(normalize(key)) ?? [];
    map.set(normalize(key), [...existing, path]);
  }
  for (const path of files) {
    const key = normalize(path);
    if (canonicalPaths.has(key)) errors.push(path + ": duplicate normalized file path");
    canonicalPaths.set(key, path);
    indexFile(fileIndex.byPath, path, path);
    indexFile(fileIndex.byName, posix.basename(path), path);
    if (extname(path).toLowerCase() === ".md") indexFile(fileIndex.byName, posix.basename(path).slice(0, -3), path);
    const isMarkdown = extname(path).toLowerCase() === ".md";
    if (!isMarkdown && !textExtensions.has(extname(path).toLowerCase()) && !basename(path).startsWith(".env")) continue;
    let content;
    try {
      const absolute = resolve(root, path);
      const actual = await realpath(absolute);
      if (!within(root, actual) || (await lstat(absolute)).isSymbolicLink()) throw new Error("File left Vault");
      content = await readFile(actual, "utf8");
    } catch { errors.push(path + ": cannot safely read file"); continue; }
    if (secretPatterns.some(pattern => pattern.test(content))) errors.push(path + ": potential secret detected");
    if (!isMarkdown) continue;
    const report = message => errors.push(path + ": " + message);
    const { metadata, body } = frontmatter(content, report);
    const doc = {
      path, metadata, body, anchors: anchors(body),
      isReadme: basename(path).toLowerCase() === "readme.md",
      isTemplate: path.startsWith("00_system/templates/"),
    };
    validateMetadata(doc, ids, report);
    documents.set(path, doc);
  }

  let linkCount = 0;
  const edges = new Map();
  for (const doc of documents.values()) {
    if (doc.isTemplate) continue;
    const refs = Array.isArray(doc.metadata?.source_refs) ? doc.metadata.source_refs.filter(text) : [];
    const links = [...wikiLinks(doc.body), ...refs.flatMap(wikiLinks)];
    edges.set(doc.path, new Set());
    for (const [index, target] of links.entries()) {
      linkCount += 1;
      const report = message => errors.push(doc.path + ": link " + (index + 1) + ": " + message);
      const resolved = lookup(target, doc.path, fileIndex);
      if (resolved.error) { report(resolved.error); continue; }
      const destination = documents.get(resolved.path);
      if (resolved.fragment !== null) {
        if (destination) {
          if (!hasAnchor(destination, resolved.fragment)) { report("missing heading or block anchor"); continue; }
        } else if (!(extname(resolved.path).toLowerCase() === ".pdf" && /^page=[1-9]\d*$/.test(resolved.fragment))) {
          report("unsupported attachment fragment"); continue;
        }
      }
      if (destination && !destination.isTemplate) edges.get(doc.path).add(destination.path);
    }
  }

  if (!documents.has(home)) errors.push("Missing HOME Markdown document: " + home);
  const reachable = new Set();
  const queue = documents.has(home) ? [home] : [];
  for (let index = 0; index < queue.length; index += 1) {
    const path = queue[index];
    if (reachable.has(path)) continue;
    reachable.add(path);
    for (const child of edges.get(path) ?? []) if (!reachable.has(child)) queue.push(child);
  }
  let reachableKnowledgeCount = 0;
  for (const doc of documents.values()) {
    if (doc.isTemplate || !["wiki", "sop"].includes(doc.metadata?.kind)
      || ["archived", "deprecated"].includes(doc.metadata?.status)) continue;
    if (!reachable.has(doc.path)) errors.push(doc.path + ": Wiki/SOP is not reachable from HOME");
    else reachableKnowledgeCount += 1;
  }
  return { errors: [...new Set(errors)].sort(), markdownCount: documents.size, linkCount, reachableKnowledgeCount };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const argv = process.argv.slice(2);
    const { values } = parseArgs({
      args: argv[0] === "--" ? argv.slice(1) : argv, strict: true, allowPositionals: false,
      options: { vault: { type: "string" }, help: { type: "boolean", short: "h" } },
    });
    if (values.help) console.log("Usage: node scripts/vault-lint.mjs [--vault <Vault directory>]\nRead-only YAML, Wikilink, attachment and HOME reachability checks.");
    else {
      const result = await lintVault(resolve(values.vault ?? defaultVault));
      for (const error of result.errors) console.error("- " + error);
      if (result.errors.length) { console.error("Vault lint failed: " + result.errors.length + " issue(s)."); process.exitCode = 1; }
      else console.log("Vault lint passed: " + result.markdownCount + " Markdown files, " + result.linkCount
        + " Wiki Links, " + result.reachableKnowledgeCount + " reachable Wiki/SOP documents.");
    }
  } catch { console.error("Vault lint could not run; check arguments and filesystem access."); process.exitCode = 1; }
}
