//post /api/questionnaires: SUS and NASA-TLX answers after each block, in both conditions

import { Request, Response } from "express"; //express types
import { recordQuestionnaire } from "../services/questionnaire.service";
import { QuestionnaireRequest, TlxRatings } from "../types/api";
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { asObject, Validator } from "../utils/validate"; //input checks

const CONDITIONS = ["app", "browser"] as const; //study conditions
const PARTICIPANT_ID = /^[pP]\d{1,3}$/; //same rule as /api/sessions and /api/decisions
const TLX_KEYS = ["mental", "physical", "temporal", "performance", "effort", "frustration"] as const;

//true for exactly 10 whole numbers from 1 to 5
function isSusList(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 10 && value.every((v) => Number.isInteger(v) && v >= 1 && v <= 5);
}

//true for a whole number from 0 to 100 in steps of 5 (the 21 marks of the NASA-TLX scale)
function isTlxValue(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 && value % 5 === 0;
}

export async function postQuestionnaire(req: Request, res: Response): Promise<void> {
  const body = asObject(req.body);
  //tlx is an object of six ratings; anything else is treated as empty so each missing rating is reported
  const tlx: Record<string, unknown> =
    typeof body.tlx === "object" && body.tlx !== null && !Array.isArray(body.tlx)
      ? (body.tlx as Record<string, unknown>)
      : {};

  const validator = new Validator(body)
    .string("participantId", { pattern: PARTICIPANT_ID, hint: "must look like P07" })
    .oneOf("condition", CONDITIONS)
    .custom("blockIndex", body.blockIndex === 1 || body.blockIndex === 2, "must be 1 or 2")
    .custom("sus", isSusList(body.sus), "must be 10 whole numbers from 1 to 5, in item order");
  for (const key of TLX_KEYS) {
    validator.custom(`tlx.${key}`, isTlxValue(tlx[key]), "must be 0 to 100 in steps of 5");
  }
  validator.check();

  const input: QuestionnaireRequest = {
    participantId: (body.participantId as string).toUpperCase(),
    condition: body.condition as "app" | "browser",
    blockIndex: body.blockIndex as 1 | 2,
    sus: body.sus as number[],
    tlx: tlx as unknown as TlxRatings,
  };
  sendSuccess(res, await recordQuestionnaire(input), 201);
}
