//exports the study data to CSV files for analysis, one file per table plus one joined file per trial
//usage (from the backend folder): npm run export            → writes to backend/exports/
//                                  npm run export -- myfolder → writes to backend/myfolder/
//the export folder holds participant data: it is gitignored, never commit it

import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "../db/mysql";

//one decision per row, with its claim, counterbalanced group, device event and the times between events
//times are in milliseconds, all from the server clock:
//  processing_ms = t2 - t1 (scan start to result), evidence_ms = t3 - t2 (result to press),
//  device_time_to_decision_ms = t3 - t0 (trial start to press)
const TRIALS_SQL = `
  SELECT
    d.*,
    c.study_set            AS claim_set,
    s.condition_order,
    s.set_order,
    bc.source_count        AS browser_video_source_count,
    h.match_state          AS light_at_press,
    h.decision             AS device_decision,
    h.trial_started_at     AS t0_trial_started_at,
    h.scan_started_at      AS t1_scan_started_at,
    h.result_shown_at      AS t2_result_shown_at,
    h.received_at          AS t3_press_received_at,
    TIMESTAMPDIFF(MICROSECOND, h.scan_started_at, h.result_shown_at) DIV 1000  AS processing_ms,
    TIMESTAMPDIFF(MICROSECOND, h.result_shown_at, h.received_at) DIV 1000      AS evidence_ms,
    TIMESTAMPDIFF(MICROSECOND, h.trial_started_at, h.received_at) DIV 1000     AS device_time_to_decision_ms
  FROM decisions d
  LEFT JOIN claims c          ON c.claim_id = d.claim_id
  LEFT JOIN study_sessions s  ON s.participant_id = d.participant_id
  LEFT JOIN hardware_events h ON h.participant_id = d.participant_id AND h.trial_index = d.trial_index
  LEFT JOIN browser_source_coding bc
    ON bc.participant_id = d.participant_id AND bc.trial_index = d.trial_index AND bc.coder = 'final'
    AND d.study_condition = 'browser'
  ORDER BY d.participant_id, d.trial_index, d.started_at`;

const FILES: { name: string; sql: string }[] = [
  { name: "trials.csv", sql: TRIALS_SQL },
  { name: "sessions.csv", sql: "SELECT * FROM study_sessions ORDER BY participant_id" },
  { name: "questionnaires.csv", sql: "SELECT * FROM questionnaire_responses ORDER BY participant_id, block_index" },
  { name: "hardware_events.csv", sql: "SELECT * FROM hardware_events ORDER BY participant_id, trial_index" },
  { name: "browser_source_coding.csv", sql: "SELECT * FROM browser_source_coding ORDER BY participant_id, trial_index, coder" },
];

//one value as CSV text: dates in ISO format, objects as JSON, quoted when needed
function csvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) return val.toISOString();
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

async function main() {
  const outDir = path.resolve(process.argv[2] ?? "exports");
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of FILES) {
    const [result, fields] = await pool.query(file.sql);
    const rows = result as Record<string, unknown>[];
    const columns = (fields as { name: string }[]).map((f) => f.name); //header even when the table is empty
    const lines = [columns.join(","), ...rows.map((row) => columns.map((col) => csvValue(row[col])).join(","))];
    //utf-8 byte order mark first, so excel shows turkish letters and curly quotes correctly (r and python ignore it)
    fs.writeFileSync(path.join(outDir, file.name), "\uFEFF" + lines.join("\n") + "\n");
    console.log(`${file.name}: ${rows.length} rows`);
  }

  console.log(`\nSaved to ${outDir}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
