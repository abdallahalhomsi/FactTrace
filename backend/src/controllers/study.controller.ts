//get /api/study/claims: the claims participants see, in a fixed order, without answers
//the app uses this to run the participant flow and to send the right claimid in both conditions

import { Request, Response } from "express"; //express types
import { groupFor, STUDY_GROUPS } from "../config/study"; //counterbalanced groups
import { listStudyClaims } from "../services/claim.service"; //reads the study lists
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