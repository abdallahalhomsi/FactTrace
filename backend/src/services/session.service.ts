//saves one row per study participant:
//study assignment + participant information form

import {
  SessionRequest,
  SessionResponse,
} from "../types/api";

import { pool } from "../db/mysql";

export async function recordSession(
  input: SessionRequest,
): Promise<SessionResponse> {
  await pool.execute(
    `
    INSERT INTO study_sessions (
      participant_id,
      condition_order,

      age,
      gender,
      education_level,

      smartphone_use,
      social_media_use,

      fact_check_frequency,
      source_check_frequency,
      multi_source_frequency,

      used_fact_check_tool,
      fact_check_tool_name,
      used_facttrace_before,

      notes
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )

    ON DUPLICATE KEY UPDATE
      condition_order =
        VALUES(condition_order),

      age =
        VALUES(age),

      gender =
        VALUES(gender),

      education_level =
        VALUES(education_level),

      smartphone_use =
        VALUES(smartphone_use),

      social_media_use =
        VALUES(social_media_use),

      fact_check_frequency =
        VALUES(fact_check_frequency),

      source_check_frequency =
        VALUES(source_check_frequency),

      multi_source_frequency =
        VALUES(multi_source_frequency),

      used_fact_check_tool =
        VALUES(used_fact_check_tool),

      fact_check_tool_name =
        VALUES(fact_check_tool_name),

      used_facttrace_before =
        VALUES(used_facttrace_before),

      notes =
        VALUES(notes)
    `,
    [
      input.participantId,
      input.conditionOrder,

      input.age,
      input.gender ?? null,
      input.educationLevel,

      input.smartphoneUse,
      input.socialMediaUse,

      input.factCheckFrequency,
      input.sourceCheckFrequency,
      input.multiSourceFrequency,

      input.usedFactCheckTool,
      input.factCheckToolName ?? null,
      input.usedFactTraceBefore,

      input.notes ?? null,
    ],
  );

  return {
    participantId: input.participantId,
    saved: true,
  };
}