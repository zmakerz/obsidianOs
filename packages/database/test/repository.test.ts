import assert from "node:assert/strict";
import test from "node:test";
import { ControlTowerRepository } from "../src/repository.ts";
import type { QueryExecutor, QueryResult, TransactionalDatabase } from "../src/types.ts";

class FakeDatabase implements TransactionalDatabase {
  readonly calls: Array<{ text: string; values: readonly unknown[] }> = [];

  async query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    this.calls.push({ text, values });
    const rows = text.includes("UPDATE approval_requests") ? [{ id: "approval-1" }] : [];
    return { rows: rows as Row[] };
  }

  async transaction<T>(operation: (executor: QueryExecutor) => Promise<T>): Promise<T> {
    return operation(this);
  }

  async close(): Promise<void> {}
}

test("approval review is parameterized and writes audit activity", async () => {
  const database = new FakeDatabase();
  const repository = new ControlTowerRepository(database);

  await repository.reviewApproval({
    workspaceId: "workspace-1",
    approvalId: "approval-1",
    decision: "approved",
    actorId: "owner-1",
  });

  assert.equal(database.calls.length, 3);
  assert.match(database.calls[0].text, /status = \$1/);
  assert.deepEqual(database.calls[0].values, ["approved", "owner-1", "approval-1", "workspace-1"]);
  assert.match(database.calls[1].text, /INSERT INTO approval_events/);
  assert.match(database.calls[2].text, /INSERT INTO activity_events/);
});

test("system actor cannot review an approval", async () => {
  const repository = new ControlTowerRepository(new FakeDatabase());
  await assert.rejects(
    repository.reviewApproval({
      workspaceId: "workspace-1",
      approvalId: "approval-1",
      decision: "approved",
      actorId: "system",
    }),
    /human actor/,
  );
});
