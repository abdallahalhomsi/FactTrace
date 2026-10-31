//saves one row per study participant: their code and which condition they did first

import { SessionRequest, SessionResponse } from "../types/api";
import { pool } from "../db/mysql";

export async function recordSession(input: SessionRequest): Promise<SessionResponse> {
  await pool.execute(
    `INSERT INTO study_sessions (participant_id, condition_order, notes)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       notes = VALUES(notes)`,
    [
      input.participantId,
      input.conditionOrder,
      input.notes ?? null,
    ]
  );

  return { participantId: input.participantId, saved: true };
}