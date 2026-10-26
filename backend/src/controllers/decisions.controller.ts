//post /api/decisions: saves the participant's verdict and sharing intention for the study
//the browser baseline uses the same route with condition "browser"

import { Request, Response } from "express"; //express types
import { ClaimSource, MatchStatus, OcrEngine, OcrError } from "../types/shared"; //types agreed with manaal
import { DecisionRequest, StudyCondition } from "../types/api"; //request shapes
import { SHARING_OPTIONS, VERDICT_OPTIONS } from "../config/study"; //allowed answers, defined in one place
import { claimExists } from "../services/claim.service"; //checks a claim id is real
import { recordDecision } from "../services/decision.service"; //saves the decision
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { AppError } from "../utils/AppError"; //used for unknown claim ids
import { asObject, Validator } from "../utils/validate"; //input checks

const VERDICTS = VERDICT_OPTIONS.map((o) => o.value); //allowed verdicts, from config/study.ts
const SHARING = SHARING_OPTIONS.map((o) => o.value); //allowed sharing answers, from config/study.ts
const CONDITIONS = ["app", "browser"] as const; //study conditions
const CLAIM_SOURCES = ["ocr", "qr", "manual"] as const; //how the claim got into the app
const MATCH_STATUSES = ["MATCH", "WEAK_MATCH", "NO_MATCH", "strong_match", "weak_match", "no_match"] as const; //what matching returned, in backend or /api/verify spelling
///api/verify sends strong_match style labels, so they are stored in the backend spelling to keep the logs consistent
const MATCH_STATUS_TO_BACKEND: Record<string, MatchStatus> = {
  MATCH: "MATCH", WEAK_MATCH: "WEAK_MATCH", NO_MATCH: "NO_MATCH",
  strong_match: "MATCH", weak_match: "WEAK_MATCH", no_match: "NO_MATCH",
};
const OCR_ENGINES = ["cloud_vision", "tesseract"] as const; //which ocr engine read the photo
const OCR_ERRORS = ["NO_TEXT", "OCR_FAILED", "PARTIAL"] as const; //ocr outcomes other than null (null means fine)

//participant codes must look like p1 to p999 (any case), so a name or student id can never be saved by mistake
const PARTICIPANT_ID = /^[pP]\d{1,3}$/;

export function postDecision(req: Request, res: Response): void {
  const body = asObject(req.body); //make sure the body is a json object
  const start = Date.parse(String(body.startedAt)); //start time as a number, nan if invalid
  const end = Date.parse(String(body.endedAt)); //end time as a number, nan if invalid

  new Validator(body)
    .string("participantId", { pattern: PARTICIPANT_ID, hint: "must look like P07 (never a name or student id)" })
    .oneOf("condition", CONDITIONS)
    .nullableString("claimId", { maxLength: 100 }) //must be sent, may be null
    .string("claimText", { maxLength: 2000 })
    .string("originalOcrText", { optional: true, maxLength: 5000 })
    .oneOf("inputSource", CLAIM_SOURCES, { optional: true })
    .oneOf("matchStatus", MATCH_STATUSES, { optional: true })
    .oneOf("ocrEngine", OCR_ENGINES, { optional: true }) //missing or null is allowed (for example qr or typed claims)
    .oneOf("ocrError", OCR_ERRORS, { optional: true }) //missing or null means ocr had no problem
    .oneOf("decision", VERDICTS)
    .oneOf("sharingIntention", SHARING)
    .stringArray("sourcesOpened", { maxItems: 100 })
    .isoDate("startedAt")
    .isoDate("endedAt")
    .custom("endedAt", Number.isNaN(start) || Number.isNaN(end) || end >= start, "must not be before startedAt") //time cannot go backwards
    .check(); //stop here with all errors if anything is wrong

  //a non-null claim id must be a claim we actually have
  if (typeof body.claimId === "string" && !claimExists(body.claimId)) {
    throw new AppError("CLAIM_NOT_FOUND", `No claim with id ${body.claimId}`);
  }

  //copy only the fields we expect, so extra fields sent by the app are never stored
  const decision: DecisionRequest = {
    participantId: (body.participantId as string).toUpperCase(), //always store in capitals (p07 becomes the same as the capital version)
    condition: body.condition as StudyCondition,
    claimId: body.claimId as string | null,
    claimText: (body.claimText as string).trim(),
    originalOcrText: body.originalOcrText as string | undefined,
    inputSource: body.inputSource as ClaimSource | undefined,
    matchStatus: typeof body.matchStatus === "string" ? MATCH_STATUS_TO_BACKEND[body.matchStatus] : undefined, //one spelling in the logs
    ocrEngine: (body.ocrEngine as OcrEngine | undefined) ?? null, //stored so the report can say how often each engine was used
    ocrError: (body.ocrError as OcrError | undefined) ?? null, //stored so the report can say how many captures were partial
    decision: body.decision as string,
    sharingIntention: body.sharingIntention as string,
    sourcesOpened: body.sourcesOpened as string[],
    startedAt: body.startedAt as string,
    endedAt: body.endedAt as string,
  };

  sendSuccess(res, recordDecision(decision), 201); //201 means something new was created
}
