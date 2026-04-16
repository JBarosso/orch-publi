import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_JuGm91gZqUrH@ep-crimson-sky-abiq3jn0-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require");
const db = drizzle(sql);

async function main() {
  try {
    await sql`ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "type" varchar(32) DEFAULT 'macarons' NOT NULL`;
    console.log("Success: added type to assets");
  } catch (error) {
    console.error("Error updating schema:", error);
  }
}

main();
