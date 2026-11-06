//get /api/study/claims: the claims participants see, in a fixed order, without answers
//the app uses this to run the participant flow and to send the right claimid in both conditions

import { Request, Response } from "express"; //express types
import { listStudyClaims } from "../services/claim.service"; //reads the study lists
import { sendSuccess } from "../utils/apiResponse"; //standard success response

export function getStudyClaims(_req: Request, res: Response): void {
  sendSuccess(res, listStudyClaims());
}