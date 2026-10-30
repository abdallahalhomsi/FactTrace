//saves the participant's decision to MySQL
//the controller and route stay the same as the mock version

import { randomUUID } from "crypto";
import { RowDataPacket } from "mysql2";
import { DecisionRequest, DecisionResponse } from "../types/api";
import { scoreDecision } from "../config/study";
import { getClaimAnswer } from "./claim.service";
import { pool } from "../db/mysql";

//the server computed values, kept in one function so the insert uses exactly the same rules
export function computeServerFields(input: DecisionRequest) {
  const correctAnswer = input.claimId ? getClaimAnswer(input.claimId) : null;
  return {
    durationMs: Date.parse(input.endedAt) - Date.parse(input.startedAt),
    correctAnswer,
    wasCorrect: correctAnswer ? scoreDecision(input.decision, correctAnswer) : null,
    textWasEdited:
      input.originalOcrText !== undefined && input.originalOcrText !== null
        ? input.originalOcrText.trim() !== input.claimText.trim()
        : null,
    sourcesOpenedCount: new Set(input.sourcesOpened).size,
    matchScore01:
      typeof input.matchScore === "number"
        ? Math.round(input.matchScore * 10) / 1000
        : null,
  };
}

export async function recordDecision(input: DecisionRequest): Promise<DecisionResponse> {
  const server = computeServerFields(input);
  const decisionId = randomUUID();
  const receivedAt = new Date();

  try {
    await pool.execute(
      `INSERT INTO decisions (
        decision_id, client_record_id, participant_id, study_condition,
        trial_index, is_practice, app_version, claim_id, claim_text,
        original_ocr_text, text_was_edited, input_source,
        match_status, match_score, weak_reason, weak_match_confirmed,
        fact_check_found, ocr_engine, ocr_error, ocr_confidence, ocr_retakes,
        decision, sharing_intention, sources_opened, sources_opened_count,
        started_at, ended_at, duration_ms, correct_answer, was_correct, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        decisionId,
        input.clientRecordId ?? null,
        input.participantId,
        input.condition,
        input.trialIndex ?? null,
        input.isPractice ?? false,
        input.appVersion ?? null,
        input.claimId,
        input.claimText,
        input.originalOcrText ?? null,
        server.textWasEdited,
        input.inputSource ?? null,
        input.matchStatus ?? null,
        server.matchScore01,
        input.weakReason ?? null,
        input.weakMatchConfirmed ?? null,
        input.factCheckFound ?? null,
        input.ocrEngine ?? null,
        input.ocrError ?? null,
        input.ocrConfidence ?? null,
        input.ocrRetakes ?? null,
        input.decision,
        input.sharingIntention,
        JSON.stringify(input.sourcesOpened),
        server.sourcesOpenedCount,
        new Date(input.startedAt),
        new Date(input.endedAt),
        server.durationMs,
        server.correctAnswer,
        server.wasCorrect,
        receivedAt,
      ]
    );

    return { decisionId, durationMs: server.durationMs };
  } catch (err: any) {
    //Duplicate clientRecordId from a client retry: return the first save
if (
  err.code === "ER_DUP_ENTRY" &&
  typeof err.message === "string" &&
  err.message.includes("uq_decisions_client_record") &&
  input.clientRecordId
) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT decision_id, duration_ms FROM decisions WHERE client_record_id = ?",
        [input.clientRecordId]
      );
      const row = rows[0];
      return { decisionId: row.decision_id, durationMs: row.duration_ms };
    }
    throw err;
  }
}