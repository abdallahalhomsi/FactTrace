//checks that everything a participant's session should save is saved, in the right order (use after each pilot or study session)
//usage (from the backend folder): npm run check-participant -- P01 [P02 ...]
//shows FAIL for missing or wrong data, WARN for things to look at, and OK when the session is complete

import "dotenv/config";
import { RowDataPacket } from "mysql2";
import { pool } from "../db/mysql";
import { groupFor, STUDY_GROUPS } from "../config/study";
import { listStudyClaims, loadClaims } from "../services/claim.service";

type Condition = "app" | "browser";
interface PlannedTrial { trialIndex: number; claimId: string; condition: Condition; isPractice: boolean }

//the same plan the app builds (mobile/src/screens/StudyFlowScreen.tsx buildPlan):
//practice 1 with the first tool, practice 2 with the second, then block 1 (first set, first tool), block 2 (other set, other tool)
function buildPlan(conditionOrder: string, setOrder: string): PlannedTrial[] {
  const claims = listStudyClaims();
  const first: Condition = conditionOrder === "app_first" ? "app" : "browser";
  const second: Condition = first === "app" ? "browser" : "app";
  const firstSet = setOrder === "b_first" ? claims.setB : claims.setA;
  const secondSet = setOrder === "b_first" ? claims.setA : claims.setB;
  const plan: PlannedTrial[] = [];
  claims.practice.forEach((c, i) => plan.push({ trialIndex: plan.length + 1, claimId: c.claimId, condition: i === 0 ? first : second, isPractice: true }));
  firstSet.forEach((c) => plan.push({ trialIndex: plan.length + 1, claimId: c.claimId, condition: first, isPractice: false }));
  secondSet.forEach((c) => plan.push({ trialIndex: plan.length + 1, claimId: c.claimId, condition: second, isPractice: false }));
  return plan;
}

async function checkParticipant(participantId: string): Promise<number> {
  let fails = 0;
  let warns = 0;
  const fail = (msg: string) => { fails++; console.log(`  FAIL  ${msg}`); };
  const warn = (msg: string) => { warns++; console.log(`  WARN  ${msg}`); };
  const ok = (msg: string) => console.log(`  ok    ${msg}`);

  console.log(`\n=== ${participantId} ===`);

  //session and counterbalanced group
  const [sessions] = await pool.query<RowDataPacket[]>("SELECT * FROM study_sessions WHERE participant_id = ?", [participantId]);
  if (sessions.length === 0) {
    fail("no session saved (the information form was not submitted)");
    return fails;
  }
  const session = sessions[0];
  const group = groupFor(participantId);
  const expected = STUDY_GROUPS[group - 1];
  if (session.condition_order === expected.conditionOrder && session.set_order === expected.setOrder) {
    ok(`session saved, group ${group}: ${session.condition_order}, ${session.set_order}`);
  } else {
    fail(`session order ${session.condition_order}/${session.set_order} does not match group ${group} (${expected.conditionOrder}/${expected.setOrder})`);
  }

  //decisions: one per planned trial, matching the plan
  const plan = buildPlan(session.condition_order, session.set_order);
  const [decisions] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM decisions WHERE participant_id = ? ORDER BY trial_index, started_at", [participantId]
  );
  const byTrial = new Map<number, RowDataPacket[]>();
  for (const d of decisions) {
    const list = byTrial.get(Number(d.trial_index)) ?? [];
    list.push(d);
    byTrial.set(Number(d.trial_index), list);
  }

  const missing = plan.filter((p) => !byTrial.has(p.trialIndex)).map((p) => p.trialIndex);
  if (missing.length === 0) ok(`all ${plan.length} trials saved`);
  else fail(`${missing.length} of ${plan.length} trials missing: ${missing.join(", ")}`);
  const extra = [...byTrial.keys()].filter((t) => !plan.some((p) => p.trialIndex === t));
  if (extra.length > 0) fail(`trials saved that are not in the plan: ${extra.join(", ")}`);

  let trialProblems = 0;
  for (const p of plan) {
    const rows = byTrial.get(p.trialIndex);
    if (!rows) continue;
    const d = rows[0];
    const label = `trial ${p.trialIndex}`;
    const before = fails + warns;
    if (rows.length > 1) fail(`${label}: saved ${rows.length} times`);
    if (d.claim_id !== p.claimId) fail(`${label}: claim ${d.claim_id}, the plan says ${p.claimId}`);
    if (d.study_condition !== p.condition) fail(`${label}: condition ${d.study_condition}, the plan says ${p.condition}`);
    if (Boolean(d.is_practice) !== p.isPractice) fail(`${label}: is_practice is ${d.is_practice}, the plan says ${p.isPractice}`);
    if (!p.isPractice && d.claim_familiarity === null) fail(`${label}: "seen this claim before?" not saved`);
    if (d.was_correct === null) fail(`${label}: correctness not scored (claim id missing?)`);
    if (Number(d.duration_ms) <= 0) fail(`${label}: duration is ${d.duration_ms} ms`);
    else if (Number(d.duration_ms) < 3000) warn(`${label}: very fast (${(Number(d.duration_ms) / 1000).toFixed(1)} s)`);
    else if (Number(d.duration_ms) > 10 * 60 * 1000) warn(`${label}: very slow (${Math.round(Number(d.duration_ms) / 60000)} min)`);
    if (!d.app_version) warn(`${label}: app_version not saved (old app build?)`);
    if (p.condition === "app" && !d.match_status) fail(`${label}: FactTrace trial without a match result`);
    if (!p.isPractice && Number(d.sources_opened_count) === 0) warn(`${label}: no sources opened`);
    if (fails + warns > before) trialProblems++;
  }
  if (decisions.length > 0 && trialProblems === 0) ok("every saved trial has the right claim, condition, timing, decision and scoring");

  //questionnaires after each block
  const [questionnaires] = await pool.query<RowDataPacket[]>(
    "SELECT study_condition, block_index, sus_score, tlx_raw FROM questionnaire_responses WHERE participant_id = ? ORDER BY block_index", [participantId]
  );
  const firstCondition: Condition = session.condition_order === "app_first" ? "app" : "browser";
  for (const block of [1, 2]) {
    const condition: Condition = block === 1 ? firstCondition : firstCondition === "app" ? "browser" : "app";
    const q = questionnaires.find((r) => Number(r.block_index) === block);
    if (!q) fail(`questionnaire after block ${block} (${condition}) missing`);
    else if (q.study_condition !== condition) fail(`questionnaire block ${block} is for ${q.study_condition}, should be ${condition}`);
    else ok(`questionnaire block ${block} (${condition}): SUS ${q.sus_score}, TLX ${q.tlx_raw}`);
  }

  //esp32 presses (one per trial once the app is connected to the device)
  const [presses] = await pool.query<RowDataPacket[]>(
    "SELECT trial_index FROM hardware_events WHERE participant_id = ?", [participantId]
  );
  if (presses.length === 0) warn("no ESP32 button presses saved (device not used or not connected)");
  else if (presses.length < plan.length) warn(`ESP32 presses for ${presses.length} of ${plan.length} trials`);
  else ok(`ESP32 presses for all ${plan.length} trials`);

  //browser source coding from the screen recording (done after data collection)
  const browserTrials = plan.filter((p) => p.condition === "browser" && !p.isPractice).length;
  const [coded] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM browser_source_coding WHERE participant_id = ? AND coder = 'final'", [participantId]
  );
  console.log(`  info  screen-recording source counts: ${coded[0].n} of ${browserTrials} browser trials coded (coding happens after data collection)`);

  console.log(fails === 0 ? `  RESULT: complete${warns > 0 ? `, ${warns} warning(s) to look at` : ""}` : `  RESULT: ${fails} problem(s)`);
  return fails;
}

async function main() {
  const ids = process.argv.slice(2).map((id) => id.trim().toUpperCase()).filter(Boolean);
  if (ids.length === 0 || ids.some((id) => !/^P\d{1,3}$/.test(id))) {
    console.log("Usage: npm run check-participant -- P01 [P02 ...]");
    process.exitCode = 1;
    await pool.end();
    return;
  }
  await loadClaims();
  let totalFails = 0;
  for (const id of ids) totalFails += await checkParticipant(id);
  await pool.end();
  if (totalFails > 0) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
