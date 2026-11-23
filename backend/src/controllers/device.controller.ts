//esp32 device routes: the device reads the light state and sends button presses, the app starts and ends trials and reads presses

import { Request, Response } from "express"; //express types
import { VERDICT_OPTIONS } from "../config/study"; //allowed decisions, defined in one place
import { claimExists } from "../services/claim.service"; //checks a claim id is real
import {
  getDeviceState,
  getDeviceStatus,
  recordHardwareDecision,
  startTrial,
  endTrial,
  DeviceCondition,
} from "../services/device.service";
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { AppError } from "../utils/AppError"; //standard error type
import { asObject, Validator } from "../utils/validate"; //input checks

const DEVICE_ID = "dev1"; //the only device used in the study
const VERDICTS = VERDICT_OPTIONS.map((o) => o.value); //trust, dont_trust, unsure
const CONDITIONS = ["app", "browser"] as const; //study conditions
const PARTICIPANT_ID = /^[pP]\d{1,3}$/; //same rule as /api/decisions, so no names or student ids

//true if the value is a whole number from 1 to 999
function isTrialIndex(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 999;
}

//get /api/device/state?deviceId=dev1 : the esp32 polls this every 300 to 500 ms
export function getState(req: Request, res: Response): void {
  if (req.query.deviceId !== DEVICE_ID) {
    throw new AppError("VALIDATION_ERROR", "Unknown device", { fields: { deviceId: `must be ${DEVICE_ID}` } });
  }
  sendSuccess(res, getDeviceState());
}

//get /api/device/status : the app polls this during a trial to see the press and whether the device is connected
export function getStatus(_req: Request, res: Response): void {
  sendSuccess(res, getDeviceStatus());
}

//post /api/device/trial : the app calls this at the start of every trial, in both conditions
export function postTrial(req: Request, res: Response): void {
  const body = asObject(req.body);
  new Validator(body)
    .string("participantId", { pattern: PARTICIPANT_ID, hint: "must look like P07 (never a name or student id)" })
    .custom("trialIndex", isTrialIndex(body.trialIndex), "must be a whole number from 1 to 999")
    .string("claimId")
    .oneOf("condition", CONDITIONS)
    .check();

  const claimId = body.claimId as string;
  if (!claimExists(claimId)) throw new AppError("CLAIM_NOT_FOUND", `No claim with id ${claimId}`);

  startTrial(
    (body.participantId as string).toUpperCase(), //stored in capitals, same as /api/decisions
    body.trialIndex as number,
    claimId,
    body.condition as DeviceCondition
  );
  sendSuccess(res, { started: true });
}

//post /api/device/end : the app calls this when the session ends, so the light turns off
export function postEnd(_req: Request, res: Response): void {
  endTrial();
  sendSuccess(res, { ended: true });
}

//post /api/device/decision : the esp32 calls this when a button is pressed
//answers 201 when saved; 409 means the press cannot be used (the esp32 should not retry those)
export async function postDecision(req: Request, res: Response): Promise<void> {
  const body = asObject(req.body);
  new Validator(body)
    .custom("deviceId", body.deviceId === DEVICE_ID, `must be ${DEVICE_ID}`)
    .custom("trialIndex", isTrialIndex(body.trialIndex), "must be a whole number from 1 to 999")
    .oneOf("decision", VERDICTS)
    .check();

  await recordHardwareDecision(body.trialIndex as number, body.decision as string);
  sendSuccess(res, { recorded: true }, 201);
}
