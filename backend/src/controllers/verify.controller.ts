//post /api/verify: one request that matches the claim and returns everything the results screen needs
//it takes the same body as /api/claims/match and answers in the frontend's verificationresult shape

import { Request, Response } from "express"; //express types
import { parseMatchRequest } from "./claims.controller"; //same input checks as /api/claims/match
import { verifyClaim } from "../services/verify.service"; //matching plus claim lookup
import { sendSuccess } from "../utils/apiResponse"; //standard success response

export function postVerify(req: Request, res: Response): void {
  sendSuccess(res, verifyClaim(parseMatchRequest(req.body))); //check input, verify, send the result
}
