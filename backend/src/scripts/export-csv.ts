//exports the decisions table to CSV for analysis
//usage: npx tsx src/scripts/export-csv.ts > decisions.csv

import "dotenv/config";
import { pool } from "../db/mysql";

async function main() {
  const [rows] = await pool.query("SELECT * FROM decisions ORDER BY participant_id, trial_index, started_at");
  const decisions = rows as any[];

  if (decisions.length === 0) {
    console.error("No decisions in the database yet.");
    process.exit(0);
  }

  const columns = Object.keys(decisions[0]);

  // CSV header
  console.log(columns.join(","));

  // CSV rows
  for (const row of decisions) {
        const values = columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return "";
      if (val instanceof Date) return val.toISOString();
      const str =
        typeof val === "object" ? JSON.stringify(val) : String(val);
      // Escape quotes and commas
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    });
    console.log(values.join(","));
  }

  console.error(`\nExported ${decisions.length} rows.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});