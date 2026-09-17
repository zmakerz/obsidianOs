import { realpath, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const projectRoot = resolve(import.meta.dirname, "..");
const allowedKinds = new Set(["article", "wiki", "sop"]);

export function parseProposalArgs(argv) {
  // Package managers may forward a single leading separator to the script.
  const forwarded = argv[0] === "--" ? argv.slice(1) : argv;
  const { values, tokens } = parseArgs({
    args: forwarded, strict: true, allowPositionals: false, tokens: true,
    options: {
      source: { type: "string" }, title: { type: "string" },
      domain: { type: "string" }, kind: { type: "string" },
      "source-root": { type: "string" }, vault: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const seen = new Set();
  for (const token of tokens) {
    if (token.kind !== "option") continue;
    if (seen.has(token.name)) throw new Error("Duplicate option: --" + token.name);
    seen.add(token.name);
  }
  return values;
}

function singleLine(value, name) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value) || !value.trim()) {
    throw new Error(name + " must be nonempty single-line text");
  }
  return value.trim();
}

function inside(root, target) {
  const part = relative(root, target);
  return part !== ".." && !part.startsWith(".." + sep) && !isAbsolute(part);
}

function slugify(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .slice(0, 80).replace(/[. ]+$/g, "") || "knowledge";
}

export async function createPromotionProposal(args, env = process.env) {
  const source = singleLine(args.source, "--source");
  const title = singleLine(args.title, "--title");
  if (title.length > 200) throw new Error("--title must be at most 200 characters");
  const domain = singleLine(args.domain ?? "general", "--domain").toLowerCase();
  const kind = singleLine(args.kind ?? "article", "--kind").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(domain)) throw new Error("--domain must use letters, numbers, and hyphens");
  if (!allowedKinds.has(kind)) throw new Error("--kind must be article, wiki, or sop");

  if (source.startsWith("chatgpt-conversation://")) {
    // A URI is only a pointer: this command never retrieves conversation content.
    if (!/^chatgpt-conversation:\/\/[a-zA-Z0-9-]+$/.test(source)) throw new Error("Invalid conversation URI");
  } else {
    const sourceRoot = args["source-root"] ?? env.BUSINESS_OS_PERSONAL_VAULT;
    if (!sourceRoot || !isAbsolute(sourceRoot) || !isAbsolute(source)) {
      throw new Error("Local --source requires an absolute --source-root (or BUSINESS_OS_PERSONAL_VAULT)");
    }
    const actualRoot = await realpath(sourceRoot);
    const actualSource = await realpath(source);
    if (!(await stat(actualRoot)).isDirectory() || !inside(actualRoot, actualSource)) {
      throw new Error("Local --source must stay inside the source root, including symlink targets");
    }
    if (!(await stat(actualSource)).isFile()) throw new Error("Local --source must be a file");
  }

  const configuredVault = args.vault ?? env.BUSINESS_OS_VAULT ?? resolve(projectRoot, "vault");
  if (!isAbsolute(configuredVault)) throw new Error("--vault must be an absolute path");
  const vault = await realpath(configuredVault);
  const inbox = await realpath(resolve(vault, "10_inbox"));
  if (!(await stat(vault)).isDirectory() || !(await stat(inbox)).isDirectory() || !inside(vault, inbox)) {
    throw new Error("10_inbox must be a directory inside the target Vault");
  }

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const outputPath = resolve(inbox, "promotion-" + today.replaceAll("-", "") + "-" + slugify(title) + ".md");
  // JSON string syntax is valid for these YAML double-quoted scalar values.
  const content = [
    "---", "kind: promotion-request", "domain: " + domain, "status: pending",
    "created: " + today, "updated: " + today, "proposed_kind: " + kind,
    "source_refs:", "  - " + JSON.stringify(source), "---", "",
    "# " + title + " — 회사 지식 승격 제안", "",
    "## 회사에서 사용할 목적", "", "작성 필요", "",
    "## 사전 검토", "",
    "- [ ] 원본을 읽었습니다.", "- [ ] 기존 Wiki·SOP·Output을 검색했습니다.",
    "- [ ] Article로 충분한지 먼저 판단했습니다.", "",
    "## 변경 계획", "",
    "- 수정할 기존 문서:", "- 새로 만들 문서:", "- HOME 또는 Map 연결:", "- 원문 보존 위치:", "",
    "## 승인", "", "- [ ] 이 계획 범위로 회사 Vault 반영을 승인합니다.", "",
    "승인 전에는 원문을 복사하거나 대상 문서를 수정하지 않습니다.", "",
  ].join("\n");

  // No source body is read/copied. Exclusive creation also rejects existing symlinks.
  await writeFile(outputPath, content, { encoding: "utf8", flag: "wx" });
  return outputPath;
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/propose-knowledge-promotion.mjs --source <absolute-file-or-chat-uri> --title <title>",
    "    [--source-root <absolute-personal-vault>] [--vault <absolute-company-vault>]",
    "    [--domain general] [--kind article|wiki|sop]",
    "",
    "Creates a pending proposal only; never reads/copies source content or applies Wiki changes.",
    "Local files require --source-root or BUSINESS_OS_PERSONAL_VAULT.",
    "Target defaults to BUSINESS_OS_VAULT or the sample vault; 10_inbox must exist.",
  ].join("\n"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = parseProposalArgs(process.argv.slice(2));
    if (args.help) printHelp();
    else console.log("Promotion proposal created: " + await createPromotionProposal(args));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Proposal failed");
    process.exitCode = 1;
  }
}
