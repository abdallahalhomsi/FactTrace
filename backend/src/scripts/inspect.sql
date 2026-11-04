-- FactTrace study inspection queries
-- Run during the study to check progress, catch missing data, and sanity-check results.
--
-- USAGE (from repo root, with Docker running):
--   docker exec -i facttrace-mysql mysql -u root -pfacttrace123 facttrace < backend/src/scripts/inspect.sql
--
-- Or open an interactive MySQL shell:
--   docker exec -it facttrace-mysql mysql -u root -pfacttrace123 facttrace

-- ============================================================
-- 1. OVERVIEW: how many participants, sessions, and decisions?
-- ============================================================

SELECT 'participants' AS metric, COUNT(*) AS n FROM study_sessions
UNION ALL
SELECT 'decisions (total)', COUNT(*) FROM decisions
UNION ALL
SELECT 'decisions (real, non-practice)', COUNT(*) FROM decisions WHERE is_practice = FALSE
UNION ALL
SELECT 'decisions (practice)', COUNT(*) FROM decisions WHERE is_practice = TRUE;

-- ============================================================
-- 2. SESSIONS: every participant, condition order, notes
--    Check this before each session starts and after it ends.
-- ============================================================

SELECT
  participant_id,
  condition_order,
  started_at,
  notes
FROM study_sessions
ORDER BY started_at;

-- ============================================================
-- 3. PER-PARTICIPANT SUMMARY: trials, accuracy, avg time
--    Real trials only (is_practice = FALSE).
-- ============================================================

SELECT
  participant_id,
  COUNT(*) AS trials,
  SUM(was_correct) AS correct,
  ROUND(SUM(was_correct) / COUNT(*) * 100, 1) AS accuracy_pct,
  ROUND(AVG(duration_ms)) AS avg_ms
FROM decisions
WHERE is_practice = FALSE
GROUP BY participant_id
ORDER BY participant_id;

-- ============================================================
-- 4. PER-CONDITION SUMMARY: app vs browser
--    The main comparison for the study.
-- ============================================================

SELECT
  study_condition,
  COUNT(*) AS n,
  SUM(was_correct) AS correct,
  ROUND(SUM(was_correct) / COUNT(*) * 100, 1) AS accuracy_pct,
  ROUND(AVG(duration_ms)) AS avg_ms,
  ROUND(AVG(sources_opened_count), 1) AS avg_sources_opened
FROM decisions
WHERE is_practice = FALSE
GROUP BY study_condition
ORDER BY study_condition;

-- ============================================================
-- 5. FULL TRIAL DETAIL FOR ONE PARTICIPANT
--    Replace 'P01' with the participant you want to inspect.
--    Use this after a session ends to verify every field.
-- ============================================================

SELECT
  trial_index,
  study_condition,
  claim_id,
  decision,
  correct_answer,
  was_correct,
  duration_ms,
  match_status,
  match_score,
  ocr_engine,
  ocr_error,
  ocr_confidence,
  ocr_retakes,
  sources_opened_count,
  is_practice,
  started_at,
  ended_at
FROM decisions
WHERE participant_id = 'P01'
ORDER BY started_at;

-- ============================================================
-- 6. DATA QUALITY CHECKS: things that should be empty if all is well
-- ============================================================

-- 6a. Decisions with a claim_id that doesn't exist in claims
--     (should be empty — FK constraint should prevent this)
SELECT decision_id, claim_id
FROM decisions
WHERE claim_id IS NOT NULL
  AND claim_id NOT IN (SELECT claim_id FROM claims);

-- 6b. Decisions where ended_at is before started_at
--     (should be empty — CHECK constraint should prevent this)
SELECT decision_id, started_at, ended_at
FROM decisions
WHERE ended_at < started_at;

-- 6c. Decisions with duration_ms inconsistent with timestamps
--     (should be empty — server computes it from the timestamps)
SELECT decision_id, duration_ms,
       TIMESTAMPDIFF(SECOND, started_at, ended_at) * 1000 AS expected_ms
FROM decisions
WHERE duration_ms != TIMESTAMPDIFF(SECOND, started_at, ended_at) * 1000;

-- 6d. Decisions where was_correct is NULL but the decision was NOT 'unsure'
--     (should be empty — was_correct is only null for unsure or missing claim)
SELECT decision_id, participant_id, decision, claim_id, was_correct
FROM decisions
WHERE was_correct IS NULL
  AND decision != 'unsure'
  AND claim_id IS NOT NULL;

-- 6e. Decisions where was_correct is set but the decision WAS 'unsure'
--     (should be empty — unsure always gives null correctness)
SELECT decision_id, participant_id, decision, was_correct
FROM decisions
WHERE decision = 'unsure'
  AND was_correct IS NOT NULL;

-- 6f. Timestamps that look like local time (a +3h shift would make
--     started_at different from the request ISO string)
--     This query shows all timestamps for manual review — no way to
--     auto-detect UTC vs local, but a +3h shift is obvious at a glance.
SELECT
  participant_id,
  trial_index,
  started_at,
  ended_at,
  received_at,
  TIMESTAMPDIFF(MINUTE, started_at, received_at) AS gap_minutes
FROM decisions
ORDER BY received_at DESC
LIMIT 20;

-- ============================================================
-- 7. CSV EXPORT PREP (optional, for a quick look)
--    This shows the columns you'd want in the final export.
--    The full export is done by backend/src/scripts/export-csv.ts.
-- ============================================================

SELECT
  participant_id,
  trial_index,
  study_condition,
  claim_id,
  decision,
  correct_answer,
  was_correct,
  duration_ms,
  match_status,
  match_score,
  ocr_engine,
  ocr_error,
  ocr_confidence,
  ocr_retakes,
  sources_opened_count,
  is_practice,
  started_at,
  ended_at
FROM decisions
ORDER BY participant_id, trial_index;