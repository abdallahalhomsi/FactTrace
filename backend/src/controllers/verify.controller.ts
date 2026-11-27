//post /api/verify: one request that matches the claim and returns everything the results screen needs
//it takes the same body as /api/claims/match and answers in the frontend's verificationresult shape

import { parseMatchRequest } from "./claims.controller"; //same input checks as /api/claims/match
import { verifyClaim } from "../services/verify.service"; //matching plus claim lookup
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { markProcessing, markDoneProcessing, updateMatchState } from "../services/device.service"; //esp32 light

import { Request, Response } from "express";

export async function postVerify(req: Request, res: Response): Promise<void> {
  const request = parseMatchRequest(req.body); //check the input before touching the light
  const studyLight = req.get("X-FactTrace-Mode") !== "normal"; // legacy clients retain existing behavior
  if (studyLight) markProcessing();
  try {
    const result = await verifyClaim(request);
    if (studyLight) updateMatchState(result.matchStatus);
    sendSuccess(res, result);
  } catch (err) {
    if (studyLight) markDoneProcessing();
    throw err;
  }
}