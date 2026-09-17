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
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> { await this.pool.end(); }
}

export function createPostgresDatabase(connectionString: string): TransactionalDatabase {
  return new PostgresDatabase(new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000 }));
}

export function createPostgresControlTowerRepository(connectionString: string) {
  const database = createPostgresDatabase(connectionString);
  return { repository: new ControlTowerRepository(database), database };
}
