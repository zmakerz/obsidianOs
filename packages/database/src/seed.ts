import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createPostgresDatabase } from "./postgres.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const database = createPostgresDatabase(connectionString);
try {
  const sql = await readFile(resolve(import.meta.dirname, "../sql/002_demo_seed.sql"), "utf8");
  await database.query(sql);
  console.log("Demo workspace seeded.");
} finally {
  await database.close();
}
