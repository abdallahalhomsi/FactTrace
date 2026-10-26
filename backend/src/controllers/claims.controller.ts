//claim routes: matching the user's text to a stored claim, and fetching a claim's evidence
//controllers only check the input and call services, all real logic lives in the services

import { Request, Response } from "express"; //express types
import { ClaimSource, MatchRequest } from "../types/shared"; //types agreed with manaal
import { getClaimDetail } from "../services/claim.service"; //claim lookup
import { matchClaim } from "../services/match.service"; //claim matching
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { asObject, Validator } from "../utils/validate"; //input checks

const CLAIM_SOURCES = ["ocr", "qr", "manual"] as const; //how a claim can enter the app

//post /api/claims/match
//body: claim text, source, and optionally the qr claim id, raw ocr text and ocr confidence. returns a match result
export function postMatch(req: Request, res: Response): void {
  const body = asObject(req.body); //make sure the body is a json object
  const v = new Validator(body)
    .oneOf("source", CLAIM_SOURCES) //source must be ocr, qr or manual
    .string("originalOcrText", { optional: true, maxLength: 5000 }) //raw ocr text is optional
    .custom(
      "ocrConfidence",
      body.ocrConfidence === undefined || body.ocrConfidence === null ||
        (typeof body.ocrConfidence === "number" && body.ocrConfidence >= 0 && body.ocrConfidence <= 1),
      "must be a number from 0 to 1 or null"
    ); //optional, the confidence from /ocr, used to explain weak matches

  if (body.source === "qr") {
    v.string("claimId", { maxLength: 100 }); //a qr scan must send the claim id it contains
    v.string("claimText", { optional: true, maxLength: 2000 }); //text is not needed for qr
  } else {
    v.string("claimText", { maxLength: 2000 }); //ocr and typed claims must send text
  }
  v.check(); //stop here with all errors if anything is wrong

  //build a clean request with only the fields we expect
  const matchReq: MatchRequest = {
    source: body.source as ClaimSource,
    claimText: typeof body.claimText === "string" ? body.claimText.trim() : "", //remove extra spaces at the ends
    claimId: body.source === "qr" ? (body.claimId as string) : undefined, //only qr requests use the id
    originalOcrText: body.originalOcrText as string | undefined,
    ocrConfidence: typeof body.ocrConfidence === "number" ? body.ocrConfidence : null, //null if not sent
  };
  sendSuccess(res, matchClaim(matchReq)); //run matching and send the result
}

//get /api/claims/:id, returns the claim with its provenance signals, evidence and sources (never the answer)
export function getClaim(req: Request<{ id: string }>, res: Response): void {
  sendSuccess(res, getClaimDetail(req.params.id)); //throws a 404 if the id is unknown
}
