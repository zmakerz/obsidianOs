import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createPromotionProposal, parseProposalArgs } from "../propose-knowledge-promotion.mjs";

async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), "business-os-proposal-test-"));
  t.after(async () => {
    assert.equal(resolve(root, ".."), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("business-os-proposal-test-"));
    await rm(root, { recursive: true, force: true });
  });
  const personal = resolve(root, "personal");
  const vault = resolve(root, "company");
  await mkdir(personal);
  await mkdir(resolve(vault, "10_inbox"), { recursive: true });
  const source = resolve(personal, "원본.md");
  await writeFile(source, "private source fixture; do not copy\n");
  return { root, personal, vault, source, args: { source, title: '정리 "예제"', "source-root": personal, vault } };
}

test("parser accepts normal/package-manager forwarding and rejects ambiguous options", () => {
  const args = ["--source", "/sample.md", "--title", "hello"];
  assert.deepEqual(parseProposalArgs(["--", ...args]), parseProposalArgs(args));
  assert.equal(parseProposalArgs(["--help"]).help, true);
  for (const invalid of [
    ["--source"], ["--unknown", "x"], ["unexpected"],
    ["--title", "one", "--title", "two"], ["--source", "--title", "x"],
  ]) assert.throws(() => parseProposalArgs(invalid));
});

test("proposal preserves source, creates only one note and refuses overwrite", async (t) => {
  const f = await fixture(t);
  const before = await readFile(f.source);
  const out = await createPromotionProposal(f.args, {});
  assert.deepEqual(await readFile(f.source), before);
  const text = await readFile(out, "utf8");
  assert.ok(text.includes("status: pending"));
  assert.ok(text.includes(JSON.stringify(f.source)));
  assert.ok(!text.includes("private source fixture"));
  assert.equal((await readdir(resolve(f.vault, "10_inbox"))).length, 1);
  await assert.rejects(createPromotionProposal(f.args, {}), { code: "EEXIST" });
  assert.equal(await readFile(out, "utf8"), text);
});

test("missing roots, outside sources, directories and invalid input cause no writes", async (t) => {
  const f = await fixture(t);
  const outside = resolve(f.root, "outside.md");
  await writeFile(outside, "outside");
  for (const change of [
    { "source-root": undefined }, { source: outside }, { source: f.personal },
    { source: "relative.md" }, { title: "line\nbreak" }, { title: "" },
    { kind: "unsupported" }, { domain: "../escape" }, { vault: "relative" },
    { source: "chatgpt-conversation://example?private=yes" },
  ]) await assert.rejects(createPromotionProposal({ ...f.args, ...change }, {}));
  assert.deepEqual(await readdir(resolve(f.vault, "10_inbox")), []);
});

test("environment roots work without hardcoded machine paths", async (t) => {
  const f = await fixture(t);
  const out = await createPromotionProposal({ source: f.source, title: "environment" },
    { BUSINESS_OS_PERSONAL_VAULT: f.personal, BUSINESS_OS_VAULT: f.vault });
  assert.ok((await readFile(out, "utf8")).includes("proposed_kind: article"));
});

test("conversation source is stored only as an unfetched pointer", async (t) => {
  const f = await fixture(t);
  const out = await createPromotionProposal({ source: "chatgpt-conversation://example", title: "pointer", vault: f.vault }, {});
  assert.ok((await readFile(out, "utf8")).includes('"chatgpt-conversation://example"'));
});

test("source-root symlink escape is rejected", async (t) => {
  const f = await fixture(t);
  const external = resolve(f.root, "external");
  await mkdir(external);
  await writeFile(resolve(external, "data.md"), "outside");
  try { await symlink(external, resolve(f.personal, "linked"), process.platform === "win32" ? "junction" : "dir"); }
  catch (e) { if (["EPERM", "EACCES", "ENOSYS"].includes(e.code)) return t.skip("OS does not permit symlink fixture"); throw e; }
  await assert.rejects(createPromotionProposal({ ...f.args, source: resolve(f.personal, "linked/data.md") }, {}), /source root/);
  assert.deepEqual(await readdir(resolve(f.vault, "10_inbox")), []);
});

test("Inbox symlink escape is rejected", async (t) => {
  const f = await fixture(t);
  const target = resolve(f.root, "outside-inbox");
  const vault = resolve(f.root, "linked-vault");
  await mkdir(target); await mkdir(vault);
  try { await symlink(target, resolve(vault, "10_inbox"), process.platform === "win32" ? "junction" : "dir"); }
  catch (e) { if (["EPERM", "EACCES", "ENOSYS"].includes(e.code)) return t.skip("OS does not permit symlink fixture"); throw e; }
  await assert.rejects(createPromotionProposal({ ...f.args, vault }, {}), /inside the target Vault/);
  assert.deepEqual(await readdir(target), []);
});

test("actual CLI works with forwarded separator and returns a failing exit code for bad input", async (t) => {
  const f = await fixture(t);
  const script = resolve(import.meta.dirname, "../propose-knowledge-promotion.mjs");
  const good = spawnSync(process.execPath, [script, "--", "--source", f.source, "--source-root", f.personal,
    "--vault", f.vault, "--title", "CLI 예제"], { encoding: "utf8" });
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /Promotion proposal created/);
  const bad = spawnSync(process.execPath, [script, "--typo"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.deepEqual(await readFile(f.source, "utf8"), "private source fixture; do not copy\n");
});
