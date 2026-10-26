//post /api/verify: one request that matches the claim and returns everything the results screen needs
//it takes the same body as /api/claims/match and answers in the frontend's verificationresult shape

import { parseMatchRequest } from "./claims.controller"; //same input checks as /api/claims/match
import { verifyClaim } from "../services/verify.service"; //matching plus claim lookup
import { sendSuccess } from "../utils/apiResponse"; //standard success response

import { Request, Response } from "express";

export async function postVerify(req: Request, res: Response): Promise<void> {
  const result = await verifyClaim(parseMatchRequest(req.body));
  sendSuccess(res, result);
}