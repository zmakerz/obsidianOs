import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
// Reuse the package manager that launched this command; do not resolve another pnpm from PATH.
const manager = process.env.npm_execpath;
const task = process.argv[2];
if (!manager || !['dev', 'build', 'typecheck'].includes(task)) {
  console.error('Run this command through the pinned pnpm version.'); process.exit(1);
}
const root = resolve(import.meta.dirname, '..');
if (task === 'typecheck') {
  for (const project of ['knowledge', 'database']) {
    const result = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', `packages/${project}/tsconfig.json`], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
const child = spawnSync(process.execPath, [manager, '--filter', '@business-os/control-tower', task], { cwd: root, stdio: 'inherit' });
process.exit(child.status ?? 1);
