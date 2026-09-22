import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { TransactionalDatabase } from "./types.ts";

export interface Migration { version: string; checksum: string; sql: string }

// Explicit manifest: 002_demo_seed.sql is optional sample data, never a migration.
const files = ["001_control_tower.sql", "003_workspace_learning.sql", "004_processing_jobs.sql", "005_processing_recovery.sql"] as const;

export async function loadMigrations(): Promise<Migration[]> {
  return Promise.all(files.map(async (version) => {
    const original = await readFile(new URL(`../sql/${version}`, import.meta.url), "utf8");
    // Preserve the released file/checksum; the runner owns its transaction now.
    const sql = version === "001_control_tower.sql"
      ? original.replace(/^BEGIN;\s*/, "").replace(/\s*COMMIT;\s*$/, "") : original;
    return { version, checksum: createHash("sha256").update(original).digest("hex"), sql };
  }));
}

/** Trusted repository SQL only. Bodies must not manage their own transactions. */
export async function runMigrations(database: TransactionalDatabase, migrations: readonly Migration[]): Promise<string[]> {
  if (!migrations.length || migrations.some((migration, index) =>
    !/^\d{3}_[a-z0-9_]+\.sql$/.test(migration.version) || !/^[a-f0-9]{64}$/.test(migration.checksum) ||
    (index > 0 && migrations[index - 1].version >= migration.version))) {
    throw new Error("Migration manifest must be nonempty, ordered, unique and checksummed");
  }
  return database.transaction(async (tx) => {
    await tx.query("SET LOCAL search_path TO public");
    await tx.query("SET LOCAL lock_timeout = '10s'");
    await tx.query("SET LOCAL statement_timeout = '60s'");
    // Transaction lock also serializes first-time ledger creation. Released on rollback.
    await tx.query("SELECT pg_advisory_xact_lock(194807, 1)");
    const ledger = await tx.query<{ exists: boolean }>(
      "SELECT to_regclass('public.business_os_migrations') IS NOT NULL AS exists",
    );
    if (!ledger.rows[0].exists) {
      const existing = await tx.query(
        "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f') LIMIT 1",
      );
      if (existing.rows.length) {
        throw new Error("Untracked public schema: use an empty dedicated database, or review and baseline the legacy schema explicitly; no changes applied");
      }
      await tx.query(`CREATE TABLE public.business_os_migrations (
        version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    }
    const history = await tx.query<{ version: string; checksum: string }>(
      "SELECT version, checksum FROM public.business_os_migrations ORDER BY version",
    );
    for (const [index, applied] of history.rows.entries()) {
      const expected = migrations[index];
      if (!expected || applied.version !== expected.version || applied.checksum !== expected.checksum) {
        throw new Error("Migration history mismatch: unknown version, order or checksum; no changes applied");
      }
    }
    const pending = migrations.slice(history.rows.length);
    for (const migration of pending) {
      await tx.query(migration.sql);
      await tx.query("INSERT INTO public.business_os_migrations (version, checksum) VALUES ($1, $2)",
        [migration.version, migration.checksum]);
    }
    return pending.map(({ version }) => version);
  });
}
