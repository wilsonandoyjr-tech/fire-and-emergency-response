import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
dotenv.config({ path: "./.env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined. Set it in Render environment variables or a local .env file.");
}

const db = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default db;
