//get /api/study/claims: the claims participants see, in a fixed order, without answers
//the app uses this to run the participant flow and to send the right claimid in both conditions

import { Request, Response } from "express"; //express types
import { groupFor, STUDY_GROUPS } from "../config/study"; //counterbalanced groups
import { getDebriefClaim, listStudyClaims } from "../services/claim.service"; //reads the study lists
import { RowDataPacket } from "mysql2/promise"; //row type for query results
import { pool } from "../db/mysql"; //shared mysql connection
import { StudyAssignment } from "../types/api";
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { AppError } from "../utils/AppError"; //standard error type

const PARTICIPANT_ID = /^[pP]\d{1,3}$/; //same rule as /api/sessions

export function getStudyClaims(_req: Request, res: Response): void {
  sendSuccess(res, listStudyClaims());
}

//get /api/study/assignment?participantId=P07: the counterbalanced group, tool order and set order for a participant
//the app uses this so the researcher never picks the order by hand
export function getStudyAssignment(req: Request, res: Response): void {
  const raw = req.query.participantId;
  if (typeof raw !== "string" || !PARTICIPANT_ID.test(raw) || Number(raw.slice(1)) < 1) {
    throw new AppError("VALIDATION_ERROR", "Invalid participant id", {
      fields: { participantId: "must look like P07" },
    });
  }
  const participantId = raw.toUpperCase();
  const group = groupFor(participantId);
  const assignment: StudyAssignment = { participantId, group, ...STUDY_GROUPS[group - 1] };
  sendSuccess(res, assignment);
}

//get /api/study/debrief?participantId=P07: the right answers for the claims this participant saw, in their order
//only after the session is finished (a decision saved for every study claim), so answers can never be seen
//during the trials; the debrief corrects any false belief the false and misleading claims may have left
export async function getDebrief(req: Request, res: Response): Promise<void> {
  const raw = req.query.participantId;
  if (typeof raw !== "string" || !PARTICIPANT_ID.test(raw) || Number(raw.slice(1)) < 1) {
    throw new AppError("VALIDATION_ERROR", "Invalid participant id", {
      fields: { participantId: "must look like P07" },
    });
  }
  const participantId = raw.toUpperCase();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT claim_id, MIN(trial_index) AS trial_index, MAX(is_practice) AS is_practice
       FROM decisions WHERE participant_id = ? AND claim_id IS NOT NULL
      GROUP BY claim_id ORDER BY MIN(trial_index)`,
    [participantId]
  );

  const studyClaims = listStudyClaims();
  const required = [...studyClaims.setA, ...studyClaims.setB].map((c) => c.claimId);
  const seen = new Set(rows.map((r) => r.claim_id as string));
  const missing = required.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new AppError("SESSION_NOT_FINISHED", "The debrief opens after the session is finished", {
      missingDecisions: missing.length,
    });
  }

  const claims = rows.flatMap((r) => {
    const claim = getDebriefClaim(r.claim_id as string);
    return claim
      ? [{ trialIndex: Number(r.trial_index), isPractice: Boolean(Number(r.is_practice)), claimId: r.claim_id as string, ...claim }]
      : [];
  });
  sendSuccess(res, { participantId, claims });
}
