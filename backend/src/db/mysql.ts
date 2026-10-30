import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE ?? "facttrace",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "Z",  // store times in UTC per Ayesha's README
});


// NOTE for recordDecision implementation:
// decisions.client_record_id has a UNIQUE constraint (uq_decisions_client_record).
// On INSERT, catch ER_DUP_ENTRY matching that constraint, SELECT the existing
// row by client_record_id, and return its decision_id + duration_ms.
// This makes the /decisions endpoint idempotent under client retries.