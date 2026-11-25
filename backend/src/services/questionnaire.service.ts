//saves the SUS and NASA-TLX answers a participant gives after each block, with the scores

import { RowDataPacket } from "mysql2"; //row type for select results
import { pool } from "../db/mysql"; //database connection
import { AppError } from "../utils/AppError"; //standard error type
import { QuestionnaireRequest, QuestionnaireResponse, TlxRatings } from "../types/api";

//SUS score (Brooke, 1996): odd items count (answer - 1), even items count (5 - answer), the sum times 2.5 gives 0 to 100
export function susScore(items: number[]): number {
  const sum = items.reduce((total, answer, i) => total + (i % 2 === 0 ? answer - 1 : 5 - answer), 0);
  return sum * 2.5;
}

//raw NASA-TLX: the mean of the six subscales, 0 to 100, no weighting
export function rawTlx(tlx: TlxRatings): number {
  const values = [tlx.mental, tlx.physical, tlx.temporal, tlx.performance, tlx.effort, tlx.frustration];
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

//one row per participant and condition; sending again replaces it, so a retry after a network error is safe
export async function recordQuestionnaire(input: QuestionnaireRequest): Promise<QuestionnaireResponse> {
  //if the participant has a session, the block must match their condition order (app_first: app is block 1)
  //so a wrong block number from the app is rejected instead of being saved silently
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT condition_order FROM study_sessions WHERE participant_id = ?",
    [input.participantId]
  );
  if (rows.length > 0) {
    const appFirst = rows[0].condition_order === "app_first";
    const expectedBlock = (input.condition === "app") === appFirst ? 1 : 2;
    if (input.blockIndex !== expectedBlock) {
      throw new AppError(
        "VALIDATION_ERROR",
        `blockIndex must be ${expectedBlock}: ${input.participantId} is ${rows[0].condition_order}, so ${input.condition} is block ${expectedBlock}`
      );
    }
  }

  const sus = susScore(input.sus);
  const tlx = rawTlx(input.tlx);

  await pool.execute(
    `INSERT INTO questionnaire_responses (
       participant_id, study_condition, block_index,
       sus_1, sus_2, sus_3, sus_4, sus_5, sus_6, sus_7, sus_8, sus_9, sus_10, sus_score,
       tlx_mental, tlx_physical, tlx_temporal, tlx_performance, tlx_effort, tlx_frustration, tlx_raw
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       block_index = VALUES(block_index),
       sus_1 = VALUES(sus_1), sus_2 = VALUES(sus_2), sus_3 = VALUES(sus_3), sus_4 = VALUES(sus_4), sus_5 = VALUES(sus_5),
       sus_6 = VALUES(sus_6), sus_7 = VALUES(sus_7), sus_8 = VALUES(sus_8), sus_9 = VALUES(sus_9), sus_10 = VALUES(sus_10),
       sus_score = VALUES(sus_score),
       tlx_mental = VALUES(tlx_mental), tlx_physical = VALUES(tlx_physical), tlx_temporal = VALUES(tlx_temporal),
       tlx_performance = VALUES(tlx_performance), tlx_effort = VALUES(tlx_effort), tlx_frustration = VALUES(tlx_frustration),
       tlx_raw = VALUES(tlx_raw),
       submitted_at = CURRENT_TIMESTAMP(3)`,
    [
      input.participantId,
      input.condition,
      input.blockIndex,
      ...input.sus,
      sus,
      input.tlx.mental,
      input.tlx.physical,
      input.tlx.temporal,
      input.tlx.performance,
      input.tlx.effort,
      input.tlx.frustration,
      tlx,
    ]
  );

  return { participantId: input.participantId, condition: input.condition, susScore: sus, tlxRaw: tlx };
}
