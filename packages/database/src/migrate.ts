import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createPostgresDatabase } from "./postgres.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const database = createPostgresDatabase(connectionString);
try {
  const sql = await readFile(resolve(import.meta.dirname, "../sql/001_control_tower.sql"), "utf8");
  await database.query(sql);
  console.log("Control Tower migration applied.");
} finally {
  await database.close();
}
