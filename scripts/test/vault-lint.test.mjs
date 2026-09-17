import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { stringify } from "yaml";
import { lintVault } from "../vault-lint.mjs";

function note(kind = "map", extra = {}, body = "") {
  const metadata = { kind, status: "draft", created: "2026-09-17", updated: "2026-09-17" };
  if (["wiki", "sop", "article", "output", "promotion-request", "capture-request"].includes(kind)) metadata.domain = "general";
  if (["wiki", "sop", "article", "output", "promotion-request"].includes(kind)) metadata.source_refs = ["synthetic-source"];
  return "---\n" + stringify({ ...metadata, ...extra }) + "---\n\n" + body;
}

async function fixture(t, extra = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "business-os-vault-test-"));
  t.after(async () => {
    assert.equal(resolve(root, ".."), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("business-os-vault-test-"));
    await rm(root, { recursive: true, force: true });
  });
  async function put(path, content) {
    const target = resolve(root, path);
    const part = relative(root, target);
    assert.ok(part !== ".." && !part.startsWith(".." + sep));
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, content);
  }
  const files = {
    "00_system/OPERATING_RULES.md": note("system-rule"),
    "00_system/templates/capture.md": '---\nkind: capture-request\ncreated: "{{date:YYYY-MM-DD}}"\nsource_url:\n---\n',
    "00_system/templates/knowledge.md": "---\nkind: wiki\nsource_refs: []\n---\n[[{{title}}]]\n",
    "00_system/templates/sop.md": "---\nkind: sop\nsource_refs: []\n---\n",
    "00_system/templates/daily-log.md": '# {{date:YYYY-MM-DD}}\n',
    "40_navigation/HOME.md": note("map"),
    ...extra,
  };
  for (const [path, content] of Object.entries(files)) await put(path, content);
  return { root, put, lint: () => lintVault(root) };
}
function clean(result) { assert.deepEqual(result.errors, []); }
function includes(result, message) { assert.ok(result.errors.some(error => error.includes(message)), result.errors.join("\n")); }
async function snapshot(root) {
  const result = {};
  async function visit(path = "") {
    for (const entry of await readdir(resolve(root, path), { withFileTypes: true })) {
      const name = path ? path + "/" + entry.name : entry.name;
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) result[name] = createHash("sha256").update(await readFile(resolve(root, name))).digest("hex");
    }
  }
  await visit();
  return result;
}

test("valid YAML arrays, comments, multiline values, Unicode and BOM/CRLF are read-only", async (t) => {
  const wiki = note("wiki", { id: "note-one", aliases: ["별칭"], summary: "첫 줄\n둘째 줄" }, "# 핵심");
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[30_wiki/한글 지식|읽는 이름]]"),
    "30_wiki/한글 지식.md": "\uFEFF" + wiki.replace("source_refs:\n  - synthetic-source", 'source_refs: ["synthetic-source"] # inline array').replaceAll("\n", "\r\n"),
  });
  const before = await snapshot(f.root);
  const result = await f.lint();
  clean(result); assert.equal(result.reachableKnowledgeCount, 1);
  assert.deepEqual(await snapshot(f.root), before);
});

for (const [label, extra, expected] of [
  ["blank kind", { kind: null }, "kind must"],
  ["list status", { status: [] }, "status must"],
  ["unsupported status", { status: "maybe" }, "unsupported status"],
  ["empty domain", { domain: " " }, "nonempty domain"],
  ["empty sources", { source_refs: [] }, "at least one source"],
  ["null sources", { source_refs: null }, "source_refs must"],
  ["scalar sources", { source_refs: "not-an-array" }, "source_refs must"],
  ["blank source item", { source_refs: [""] }, "source_refs must"],
  ["invalid date", { created: "2026-02-30" }, "real YYYY-MM-DD"],
  ["date wrong type", { updated: [] }, "real YYYY-MM-DD"],
  ["aliases wrong type", { aliases: "alias" }, "aliases must"],
  ["blank id", { id: " " }, "id must"],
]) {
  test("rejects " + label + " without editing notes", async (t) => {
    const f = await fixture(t, {
      "40_navigation/HOME.md": note("map", {}, "[[30_wiki/topic]]"),
      "30_wiki/topic.md": note("wiki", extra),
    });
    const before = await snapshot(f.root);
    includes(await f.lint(), expected);
    assert.deepEqual(await snapshot(f.root), before);
  });
}

test("duplicate IDs fail; blank Company Profile and new kinds are allowed", async (t) => {
  const f = await fixture(t, {
    "a.md": note("company-profile", { id: "same-id" }, "# Company\n\nNot filled yet"),
    "b.md": note("custom-kind", { id: "same-id" }),
  });
  includes(await f.lint(), "duplicate id");
  await f.put("b.md", note("custom-kind", { id: "different-id" }));
  clean(await f.lint());
});

test("kind-specific promotion metadata is checked without making Article require a Map", async (t) => {
  const f = await fixture(t, {
    "80_outputs/article.md": note("article"),
    "10_inbox/proposal.md": note("promotion-request", { proposed_kind: "wrong" }),
  });
  includes(await f.lint(), "proposed_kind");
  await f.put("10_inbox/proposal.md", note("promotion-request", { proposed_kind: "article" }));
  clean(await f.lint());
});

for (const [label, content, expected] of [
  ["duplicate YAML keys", "---\nkind: wiki\nkind: map\n---\n", "DUPLICATE_KEY"],
  ["YAML sequence", "---\n- not-a-map\n---\n", "YAML mapping"],
  ["unclosed frontmatter", "---\nkind: map\n", "unclosed frontmatter"],
  ["missing frontmatter", "# title", "missing valid frontmatter"],
  ["YAML custom tag", "---\nkind: !unknown thing\n---\n", "invalid YAML"],
  ["alias expansion", "---\na: &a [1,2,3]\nb: &b [*a,*a,*a,*a,*a]\nc: [*b,*b,*b,*b,*b]\n---\n", "YAML aliases"],
]) {
  test("rejects " + label, async (t) => {
    const f = await fixture(t, { "a.md": content });
    includes(await f.lint(), expected);
  });
}

test("templates allow placeholders but reject invalid YAML and cannot hide an orphan", async (t) => {
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[00_system/templates/knowledge]]"),
    "00_system/templates/knowledge.md": "---\nkind: wiki\nsource_refs: []\n---\n[[30_wiki/orphan]]",
    "30_wiki/orphan.md": note("wiki"),
  });
  includes(await f.lint(), "not reachable from HOME");
  await f.put("00_system/templates/knowledge.md", "---\nkind: wiki\nkind: wiki\n---");
  includes(await f.lint(), "DUPLICATE_KEY");
});

test("real path with display alias works; alias-only target is not a file", async (t) => {
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[30_wiki/real|보기 이름]]\n[[별칭]]"),
    "30_wiki/real.md": note("wiki", { aliases: ["별칭"] }),
  });
  includes(await f.lint(), "unresolved Wiki Link");
  await f.put("40_navigation/HOME.md", note("map", {}, "[[30_wiki/real|별칭]]"));
  clean(await f.lint());
});

test("ambiguous basenames fail; explicit relative and Vault paths resolve", async (t) => {
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[topic]]"),
    "30_wiki/a/topic.md": note("wiki", {}, "[[../b/topic.md|other]]"),
    "30_wiki/b/topic.md": note("sop", {}, "[[./../a/topic]]"),
  });
  includes(await f.lint(), "ambiguous Wiki Link");
  await f.put("40_navigation/HOME.md", note("map", {}, "[[30_wiki/a/topic.md]]"));
  clean(await f.lint());
});

test("heading chains, formatted headings, setext headings and block anchors resolve", async (t) => {
  const tick = String.fromCharCode(96);
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[30_wiki/topic#Title#Details]]\n[[30_wiki/topic#^fact-1]]\n[[30_wiki/topic#Setext]]\n[[30_wiki/topic#API_v2]]"),
    "30_wiki/topic.md": note("wiki", {}, "# Title\n## **Details**\nA fact ^fact-1\n\nSetext\n=====\n\n## " + tick + "API_v2" + tick),
  });
  clean(await f.lint());
  await f.put("40_navigation/HOME.md", note("map", {}, "[[30_wiki/topic]]\n[[30_wiki/topic#missing]]\n[[30_wiki/topic#^missing]]\n[[30_wiki/topic#Wrong#Details]]"));
  assert.equal((await f.lint()).errors.filter(error => error.includes("missing heading or block")).length, 3);
});

test("local-only heading links work; comments and code cannot create links or anchors", async (t) => {
  const tick = String.fromCharCode(96);
  const body = "# Real\n[[#Real]]\n" + tick + "[[missing-inline]]" + tick
    + "\n" + tick.repeat(4) + "md\n[[missing-fence]]\n# Fake\n" + tick.repeat(3) + "\n[[still-in-fence]]\n" + tick.repeat(4)
    + "\n~~~md\n[[missing-tilde]]\n~~~\n<!-- [[missing-html]] -->\n%% [[missing-comment]] %%\n\\[[escaped]]";
  const f = await fixture(t, { "40_navigation/HOME.md": note("map", { aliases: ["[[not-a-link]]"] }, body) });
  const result = await f.lint(); clean(result); assert.equal(result.linkCount, 1);
  await f.put("40_navigation/HOME.md", note("map", {}, body + "\n[[#Fake]]"));
  includes(await f.lint(), "missing heading");
});

test("attachments with display dimensions resolve; PDF page pointer is not a page-count check", async (t) => {
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "![[attachments/picture.png|200]]\n![[attachments/paper.pdf#page=1]]"),
    "attachments/picture.png": Buffer.from([0, 1, 2]),
    "attachments/paper.pdf": Buffer.from("%PDF-fixture"),
  });
  clean(await f.lint());
  await f.put("40_navigation/HOME.md", note("map", {}, "![[attachments/missing.png]]"));
  includes(await f.lint(), "unresolved Wiki Link");
});

test("source_refs local Wikilinks are checked and connect real documents", async (t) => {
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[a]]"),
    "a.md": note("wiki", { source_refs: ["[[b|source]]", "https://example.invalid/not-fetched"] }),
    "b.md": note("sop"),
  });
  const result = await f.lint(); clean(result); assert.equal(result.reachableKnowledgeCount, 2);
  await f.put("b.md", note("sop", { source_refs: ["[[missing-source]]"] }));
  includes(await f.lint(), "unresolved Wiki Link");
});

test("a self-link or disconnected cycle is not HOME reachability", async (t) => {
  const f = await fixture(t, {
    "a.md": note("wiki", {}, "[[a]]\n[[b]]"),
    "b.md": note("sop", {}, "[[a]]"),
  });
  assert.equal((await f.lint()).errors.filter(error => error.includes("not reachable")).length, 2);
  await f.put("40_navigation/HOME.md", note("map", {}, "[[a]]"));
  clean(await f.lint());
});

test("archived Wiki and standalone Article do not require navigation", async (t) => {
  const f = await fixture(t, {
    "99_archive/old.md": note("wiki", { status: "archived" }),
    "80_outputs/article.md": note("article"),
    "README.md": "No metadata required",
    ".obsidian/private.json": '{"not":"scanned"}',
    ".trash/broken.md": "# deliberately ignored",
  });
  clean(await f.lint());
});

test("path escape and missing required HOME fail", async (t) => {
  const f = await fixture(t, { "40_navigation/HOME.md": note("map", {}, "[[../../outside]]") });
  includes(await f.lint(), "escapes Vault");
  const result = await lintVault(f.root, { home: "missing.md" });
  includes(result, "Missing HOME");
  includes(await lintVault(resolve(f.root, "not-found")), "Vault is missing");
  includes(await lintVault(resolve(f.root, "40_navigation/HOME.md")), "not a directory");
});

test("symlinks are rejected without reading private settings", async (t) => {
  const f = await fixture(t, { ".obsidian/hidden.md": "sk-" + "x".repeat(24) });
  try { await symlink(resolve(f.root, ".obsidian"), resolve(f.root, "escape"), process.platform === "win32" ? "junction" : "dir"); }
  catch (e) { if (["EPERM", "EACCES", "ENOSYS"].includes(e.code)) return t.skip("OS does not allow symlink fixture"); throw e; }
  const result = await f.lint();
  includes(result, "symlinks are not inspected");
  assert.ok(!result.errors.some(error => error.includes("potential secret")));
});

test("YAML and secret diagnostics do not echo secret content", async (t) => {
  const secret = "sk-" + "z".repeat(24);
  const f = await fixture(t, { "bad.md": "---\nkey: [" + secret + "\n---\n" });
  const result = await f.lint();
  includes(result, "invalid YAML"); includes(result, "potential secret");
  assert.ok(!result.errors.join("\n").includes(secret));
});

test("CLI supports alternate Vaults and fails on invalid input", async (t) => {
  const f = await fixture(t);
  const script = resolve(import.meta.dirname, "../vault-lint.mjs");
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  const good = run(["--", "--vault", f.root]);
  assert.equal(good.status, 0, good.stderr);
  await f.put("broken.md", "No metadata");
  const bad = run(["--vault", f.root]);
  assert.equal(bad.status, 1); assert.match(bad.stderr, /missing valid frontmatter/);
  assert.equal(run(["--unknown"]).status, 1);
  assert.equal(run(["--vault"]).status, 1);
});

test("checked-in public Vault passes strict structural checks", async () => {
  const result = await lintVault(resolve(import.meta.dirname, "../../vault"));
  clean(result); assert.equal(result.reachableKnowledgeCount, 5);
});

test("literal heading underscores must not be mistaken for formatting", async (t) => {
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[a]]\n[[a#APIv2]]"),
    "a.md": note("wiki", {}, "# API_v2"),
  });
  includes(await f.lint(), "missing heading");
  await f.put("40_navigation/HOME.md", note("map", {}, "[[a#API_v2]]"));
  clean(await f.lint());
});

test("README metadata is optional and uppercase Markdown extensions resolve", async (t) => {
  const f = await fixture(t, {
    "README.md": "---\naliases: [Read me]\n---\nNo common fields needed",
    "40_navigation/HOME.md": note("map", {}, "[[Topic]]"),
    "30_wiki/Topic.MD": note("wiki"),
  });
  clean(await f.lint());
});

test("dot-folder Vault paths are not incorrectly treated as relative paths", async (t) => {
  const f = await fixture(t, {
    "40_navigation/HOME.md": note("map", {}, "[[.notes/topic]]"),
    ".notes/topic.md": note("wiki"),
  });
  clean(await f.lint());
});

test("kind capitalization cannot bypass kind-specific requirements", async (t) => {
  const f = await fixture(t, { "topic.md": note("Wiki") });
  includes(await f.lint(), "kind must be a lowercase identifier");
});

test("frontmatter limit measures UTF-8 bytes, including multilingual text", async (t) => {
  const f = await fixture(t, { "large.md": note("map", { summary: "한".repeat(23000) }) });
  includes(await f.lint(), "frontmatter exceeds 64 KiB");
});
