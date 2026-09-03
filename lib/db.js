import { neon } from "@neondatabase/serverless";

// A single shared SQL query function, built from the DATABASE_URL
// environment variable. Every API route imports this to talk to Neon.
//
// Usage: const rows = await sql`select * from clients where id = ${id}`;
export const sql = neon(process.env.DATABASE_URL);
