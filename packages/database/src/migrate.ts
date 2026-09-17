import { createPostgresDatabase } from "./postgres.ts";
import { loadMigrations, runMigrations } from "./migrations.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const database = createPostgresDatabase(connectionString);
try {
  const applied = await runMigrations(database, await loadMigrations());
  console.log(applied.length ? `Applied migrations: ${applied.join(", ")}` : "Database is up to date.");
} finally {
  await database.close();
}
