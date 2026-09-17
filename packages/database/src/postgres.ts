import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { ControlTowerRepository } from "./repository.ts";
import type { QueryExecutor, QueryResult, TransactionalDatabase } from "./types.ts";

class PostgresDatabase implements TransactionalDatabase {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async query<Row extends Record<string, unknown> = QueryResultRow>(
    text: string, values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    const result = await this.pool.query(text, [...values]);
    return { rows: result.rows as Row[] };
  }

  async transaction<T>(operation: (executor: QueryExecutor) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    let discard = false;
    try {
      await client.query("BEGIN");
      const executor: QueryExecutor = {
        query: async <Row extends Record<string, unknown>>(text: string, values: readonly unknown[] = []) => {
          const result = await client.query(text, [...values]);
          return { rows: result.rows as Row[] };
        },
      };
      const result = await operation(executor);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { discard = true; }
      throw error;
    } finally {
      client.release(discard);
    }
  }

  async close(): Promise<void> { await this.pool.end(); }
}

export function createPostgresDatabase(connectionString: string): TransactionalDatabase {
  const pool = new Pool({
    connectionString, max: 5, idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000, statement_timeout: 60_000,
    idle_in_transaction_session_timeout: 60_000, application_name: "business-os",
  });
  // pg removes failed idle clients. Handle the event without logging credentials/SQL.
  pool.on("error", () => { console.error("PostgreSQL idle connection closed; a later request will reconnect."); });
  return new PostgresDatabase(pool);
}

export function createPostgresControlTowerRepository(connectionString: string) {
  const database = createPostgresDatabase(connectionString);
  return { repository: new ControlTowerRepository(database), database };
}

type SharedDatabase = ReturnType<typeof createPostgresControlTowerRepository> & { connectionString: string };
const runtime = globalThis as typeof globalThis & { __businessOsPostgres?: SharedDatabase };

/** Server runtime only; shared across requests and development module reloads. */
export function getSharedPostgresControlTowerRepository(connectionString: string) {
  if (runtime.__businessOsPostgres && runtime.__businessOsPostgres.connectionString !== connectionString) {
    throw new Error("Database configuration changed; restart the server to switch databases");
  }
  runtime.__businessOsPostgres ??= { connectionString, ...createPostgresControlTowerRepository(connectionString) };
  const { database, repository } = runtime.__businessOsPostgres;
  return { database, repository };
}

/** Process shutdown/test teardown only, after in-flight work has finished. */
export async function closeSharedPostgresDatabase(): Promise<void> {
  const shared = runtime.__businessOsPostgres;
  delete runtime.__businessOsPostgres;
  await shared?.database.close();
}
