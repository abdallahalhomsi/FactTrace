//post /api/sessions: records one study session (participant code + condition order)

import { Request, Response } from "express";
import { ConditionOrder, SessionRequest } from "../types/api";
import { recordSession } from "../services/session.service";
import { sendSuccess } from "../utils/apiResponse";
import { asObject, Validator } from "../utils/validate";

const CONDITION_ORDERS = ["app_first", "browser_first"] as const;
const PARTICIPANT_ID = /^[pP]\d{1,3}$/;

export async function postSession(req: Request, res: Response): Promise<void> {
  const body = asObject(req.body);

  new Validator(body)
    .string("participantId", { pattern: PARTICIPANT_ID, hint: "must look like P07" })
    .oneOf("conditionOrder", CONDITION_ORDERS)
    .string("notes", { optional: true, maxLength: 500 })
    .check();

  const session: SessionRequest = {
    participantId: (body.participantId as string).toUpperCase(),
    conditionOrder: body.conditionOrder as ConditionOrder,
    notes: body.notes as string | undefined,
  };

  sendSuccess(res, await recordSession(session), 201);
}