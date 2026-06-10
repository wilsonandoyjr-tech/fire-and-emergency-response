import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
dotenv.config({ path: "./.env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const db = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default db;
