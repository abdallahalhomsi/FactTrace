//browser source coding from the screen recordings (see docs/source-use-metric.md)
//usage (from the backend folder):
//  npm run coding -- sheet [folder]          one blank coding sheet per coder (default folder: exports/coding)
//  npm run coding -- import coder1 file.csv  load a filled sheet (coder1, coder2 or final)
//  npm run coding -- agreement               compare the two coders and list the trials to discuss
//  npm run coding -- finalize                copy agreed counts to "final"; disagreements stay for discussion
//the sheets hold participant data: they are written to the gitignored exports folder, never commit them

import "dotenv/config";
import fs from "fs";
import path from "path";
import { RowDataPacket } from "mysql2";
import { pool } from "../db/mysql";

type Coder = "coder1" | "coder2" | "final";
const CODERS: Coder[] = ["coder1", "coder2", "final"];

const SHEET_COLUMNS = [
  "participant_id",
  "trial_index",
  "claim_id",
  "claim",
  "trial_start_time",
  "decision_time",
  "source_count",
  "notes",
];

//clock time in turkey, so the coder can find the trial in the video by the phone's status bar clock
function localTime(value: Date): string {
  return value.toLocaleTimeString("en-GB", { timeZone: "Europe/Istanbul", hour12: false });
}

function csvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

//small csv reader: handles quoted fields, commas and line breaks inside quotes, and a byte order mark
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

//the browser study trials (practice excluded, as in the analysis)
async function browserTrials() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT participant_id, trial_index, claim_id, claim_text, started_at, ended_at, sources_opened_count
     FROM decisions
     WHERE study_condition = 'browser' AND is_practice = 0 AND trial_index IS NOT NULL
     ORDER BY participant_id, trial_index`
  );
  return rows;
}

//one sheet per coder with the same trials; the self-reported count is left out so coders are not influenced
async function writeSheets(folder: string) {
  const outDir = path.resolve(folder);
  fs.mkdirSync(outDir, { recursive: true });
  const trials = await browserTrials();
  const lines = [
    SHEET_COLUMNS.join(","),
    ...trials.map((t) =>
      [
        t.participant_id,
        t.trial_index,
        t.claim_id,
        t.claim_text,
        localTime(new Date(t.started_at)),
        localTime(new Date(t.ended_at)),
        "",
        "",
      ].map(csvValue).join(",")
    ),
  ];
  for (const coder of ["coder1", "coder2"]) {
    const file = path.join(outDir, `browser_coding_${coder}.csv`);
    fs.writeFileSync(file, "﻿" + lines.join("\n") + "\n");
    console.log(`${file}: ${trials.length} trials`);
  }
  console.log("\nGive each coder their own sheet. They fill in source_count (and notes if unsure) without talking to each other.");
}

async function importSheet(coder: Coder, file: string) {
  const rows = parseCsv(fs.readFileSync(path.resolve(file), "utf8"));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  for (const required of ["participant_id", "trial_index", "source_count"]) {
    if (col(required) < 0) throw new Error(`The sheet has no "${required}" column`);
  }

  const trials = await browserTrials();
  const known = new Map(trials.map((t) => [`${t.participant_id}#${t.trial_index}`, t]));

  let saved = 0;
  const skipped: string[] = [];
  for (const [i, row] of rows.slice(1).entries()) {
    const line = i + 2;
    const participantId = (row[col("participant_id")] ?? "").trim().toUpperCase();
    const trialIndex = Number((row[col("trial_index")] ?? "").trim());
    const countText = (row[col("source_count")] ?? "").trim();
    const notes = col("notes") >= 0 ? (row[col("notes")] ?? "").trim() : "";
    const trial = known.get(`${participantId}#${trialIndex}`);

    if (countText === "") { skipped.push(`line ${line}: ${participantId} trial ${trialIndex} has no count yet`); continue; }
    const count = Number(countText);
    if (!Number.isInteger(count) || count < 0 || count > 50) { skipped.push(`line ${line}: "${countText}" is not a whole number from 0 to 50`); continue; }
    if (!trial) { skipped.push(`line ${line}: ${participantId} trial ${trialIndex} is not a browser study trial`); continue; }

    //a coder can re-import a corrected sheet: their earlier count for that trial is replaced
    await pool.execute(
      `INSERT INTO browser_source_coding (participant_id, trial_index, coder, claim_id, source_count, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE source_count = VALUES(source_count), notes = VALUES(notes),
         claim_id = VALUES(claim_id), coded_at = CURRENT_TIMESTAMP(3)`,
      [participantId, trialIndex, coder, trial.claim_id, count, notes || null]
    );
    saved++;
  }

  console.log(`${coder}: ${saved} counts saved`);
  if (skipped.length > 0) console.log(`Skipped ${skipped.length}:\n  ${skipped.join("\n  ")}`);
}

//two-way random, absolute agreement, single rater: ICC(2,1) (Shrout & Fleiss, 1979)
function icc21(pairs: [number, number][]): number | null {
  const n = pairs.length;
  const k = 2;
  if (n < 2) return null;
  const all = pairs.flat();
  const grand = all.reduce((a, b) => a + b, 0) / all.length;
  const rowMeans = pairs.map(([a, b]) => (a + b) / 2);
  const colMeans = [0, 1].map((c) => pairs.reduce((sum, p) => sum + p[c], 0) / n);
  const ssRows = k * rowMeans.reduce((sum, m) => sum + (m - grand) ** 2, 0);
  const ssCols = n * colMeans.reduce((sum, m) => sum + (m - grand) ** 2, 0);
  const ssTotal = all.reduce((sum, x) => sum + (x - grand) ** 2, 0);
  const ssError = ssTotal - ssRows - ssCols;
  const msRows = ssRows / (n - 1);
  const msCols = ssCols / (k - 1);
  const msError = ssError / ((n - 1) * (k - 1));
  const denominator = msRows + (k - 1) * msError + (k * (msCols - msError)) / n;
  return denominator === 0 ? null : (msRows - msError) / denominator;
}

//counts per trial from the coding table, keyed by participant and trial
async function codedCounts() {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT participant_id, trial_index, coder, source_count, notes FROM browser_source_coding"
  );
  const byTrial = new Map<string, Partial<Record<Coder, { count: number; notes: string | null }>>>();
  for (const r of rows) {
    const key = `${r.participant_id}#${r.trial_index}`;
    const entry = byTrial.get(key) ?? {};
    entry[r.coder as Coder] = { count: Number(r.source_count), notes: r.notes };
    byTrial.set(key, entry);
  }
  return byTrial;
}

async function agreement() {
  const trials = await browserTrials();
  const coded = await codedCounts();

  const pairs: [number, number][] = [];
  const disagreements: string[] = [];
  const missing: string[] = [];
  const selfVsFinal: [number, number][] = [];

  for (const t of trials) {
    const key = `${t.participant_id}#${t.trial_index}`;
    const c = coded.get(key) ?? {};
    if (c.coder1 && c.coder2) {
      pairs.push([c.coder1.count, c.coder2.count]);
      if (c.coder1.count !== c.coder2.count) {
        const final = c.final ? ` → final ${c.final.count}` : " → needs a final count";
        disagreements.push(`${t.participant_id} trial ${t.trial_index} (${t.claim_id}): coder1 ${c.coder1.count}, coder2 ${c.coder2.count}${final}`);
      }
    } else {
      missing.push(`${t.participant_id} trial ${t.trial_index}: ${[c.coder1 ? null : "coder1", c.coder2 ? null : "coder2"].filter(Boolean).join(" and ")} missing`);
    }
    if (c.final) selfVsFinal.push([Number(t.sources_opened_count), c.final.count]);
  }

  console.log(`Browser study trials: ${trials.length}`);
  console.log(`Coded by both coders: ${pairs.length}`);
  if (pairs.length > 0) {
    const exact = pairs.filter(([a, b]) => a === b).length;
    const meanDiff = pairs.reduce((sum, [a, b]) => sum + Math.abs(a - b), 0) / pairs.length;
    const icc = icc21(pairs);
    console.log(`Exact agreement: ${exact}/${pairs.length} (${((exact / pairs.length) * 100).toFixed(1)}%)`);
    console.log(`Mean absolute difference: ${meanDiff.toFixed(2)} sources`);
    console.log(`ICC(2,1), absolute agreement: ${icc === null ? "not defined (needs at least 2 trials with different counts)" : icc.toFixed(3)}`);
  }
  if (disagreements.length > 0) console.log(`\nDisagreements to discuss (${disagreements.length}):\n  ${disagreements.join("\n  ")}`);
  if (missing.length > 0) console.log(`\nNot coded yet (${missing.length}):\n  ${missing.join("\n  ")}`);
  if (selfVsFinal.length > 0) {
    const diff = selfVsFinal.reduce((sum, [self, final]) => sum + (self - final), 0) / selfVsFinal.length;
    const same = selfVsFinal.filter(([self, final]) => self === final).length;
    console.log(`\nSelf-report vs final video count (${selfVsFinal.length} trials): same in ${same}, mean difference ${diff >= 0 ? "+" : ""}${diff.toFixed(2)} (positive = participants listed more than the video shows)`);
  }
}

//where both coders gave the same count, that count becomes final; disagreements are left for discussion
async function finalize() {
  const coded = await codedCounts();
  const trials = await browserTrials();
  let copied = 0;
  let open = 0;
  for (const t of trials) {
    const c = coded.get(`${t.participant_id}#${t.trial_index}`) ?? {};
    if (!c.coder1 || !c.coder2 || c.final) continue;
    if (c.coder1.count === c.coder2.count) {
      await pool.execute(
        `INSERT INTO browser_source_coding (participant_id, trial_index, coder, claim_id, source_count, notes)
         VALUES (?, ?, 'final', ?, ?, 'both coders agreed')`,
        [t.participant_id, t.trial_index, t.claim_id, c.coder1.count]
      );
      copied++;
    } else open++;
  }
  console.log(`${copied} agreed counts saved as final.`);
  if (open > 0) console.log(`${open} disagreements still need a final count: discuss them, put the agreed numbers in a sheet and run "import final".`);
}

async function main() {
  const [command, arg1, arg2] = process.argv.slice(2);
  if (command === "sheet") await writeSheets(arg1 ?? "exports/coding");
  else if (command === "import" && CODERS.includes(arg1 as Coder) && arg2) await importSheet(arg1 as Coder, arg2);
  else if (command === "agreement") await agreement();
  else if (command === "finalize") await finalize();
  else {
    console.log("Usage:\n  npm run coding -- sheet [folder]\n  npm run coding -- import coder1|coder2|final file.csv\n  npm run coding -- agreement\n  npm run coding -- finalize");
    process.exitCode = 1;
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
