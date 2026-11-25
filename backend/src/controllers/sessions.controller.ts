//post /api/sessions: records one study session,
// including the participant information form

import { Request, Response } from "express";

import {
  ConditionOrder,
  EducationLevel,
  GenderOption,
  SessionRequest,
  SetOrder,
  SmartphoneUseRange,
  SocialMediaUseRange,
} from "../types/api";

import { groupFor, STUDY_GROUPS } from "../config/study";

import { recordSession } from "../services/session.service";
import { sendSuccess } from "../utils/apiResponse";
import { asObject, Validator } from "../utils/validate";

const CONDITION_ORDERS = [
  "app_first",
  "browser_first",
] as const;

const SET_ORDERS = [
  "a_first",
  "b_first",
] as const;

const GENDER_OPTIONS = [
  "female",
  "male",
  "another",
  "prefer_not_to_say",
] as const;

const EDUCATION_LEVELS = [
  "undergraduate",
  "graduate",
  "other",
] as const;

const SMARTPHONE_USE_RANGES = [
  "lt_1",
  "1_3",
  "3_5",
  "5_7",
  "gt_7",
] as const;

const SOCIAL_MEDIA_USE_RANGES = [
  "lt_1",
  "1_2",
  "2_4",
  "4_6",
  "gt_6",
] as const;

const PARTICIPANT_ID = /^[pP]\d{1,3}$/;

function isIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

export async function postSession(
  req: Request,
  res: Response,
): Promise<void> {
  const body = asObject(req.body);

  new Validator(body)
    .string("participantId", {
      pattern: PARTICIPANT_ID,
      hint: "must look like P07",
    })

    .oneOf(
      "conditionOrder",
      CONDITION_ORDERS,
    )

    .oneOf(
      "setOrder",
      SET_ORDERS,
      { optional: true },
    )

    .custom(
      "age",
      isIntegerInRange(body.age, 18, 100),
      "must be an integer from 18 to 100",
    )

    .oneOf(
      "gender",
      GENDER_OPTIONS,
      { optional: true },
    )

    .oneOf(
      "educationLevel",
      EDUCATION_LEVELS,
    )

    
    .string(
      "faculty",
      {
        optional: true,
        maxLength: 100,
      },
    )

    .custom(
      "studyYear",
      body.studyYear === undefined ||
        body.studyYear === null ||
        isIntegerInRange(body.studyYear, 1, 8),
      "must be an integer from 1 to 8",
    )

    .oneOf(
      "smartphoneUse",
      SMARTPHONE_USE_RANGES,
    )

    .oneOf(
      "socialMediaUse",
      SOCIAL_MEDIA_USE_RANGES,
    )

    .custom(
      "factCheckFrequency",
      isIntegerInRange(
        body.factCheckFrequency,
        1,
        7,
      ),
      "must be an integer from 1 to 7",
    )

    .custom(
      "sourceCheckFrequency",
      isIntegerInRange(
        body.sourceCheckFrequency,
        1,
        7,
      ),
      "must be an integer from 1 to 7",
    )

    .custom(
      "multiSourceFrequency",
      isIntegerInRange(
        body.multiSourceFrequency,
        1,
        7,
      ),
      "must be an integer from 1 to 7",
    )

    .custom(
      "usedFactCheckTool",
      typeof body.usedFactCheckTool ===
        "boolean",
      "must be true or false",
    )

    .string(
      "factCheckToolName",
      {
        optional: true,
        maxLength: 200,
      },
    )

    .custom(
      "usedFactTraceBefore",
      typeof body.usedFactTraceBefore ===
        "boolean",
      "must be true or false",
    )

    .string(
      "notes",
      {
        optional: true,
        maxLength: 500,
      },
    )

    .check();

  const participantId = (
    body.participantId as string
  ).toUpperCase();

  const session: SessionRequest = {
    participantId,

    conditionOrder:
      body.conditionOrder as ConditionOrder,

    //the app can leave this out: it then follows the participant's counterbalanced group
    setOrder:
      (body.setOrder as SetOrder | undefined) ??
      STUDY_GROUPS[groupFor(participantId) - 1].setOrder,

    age: body.age as number,

    gender:
      body.gender as
        | GenderOption
        | undefined,

    educationLevel:
      body.educationLevel as EducationLevel,

    faculty:
      typeof body.faculty === "string" &&
      body.faculty.trim().length > 0
        ? body.faculty.trim()
        : undefined,

    studyYear:
      typeof body.studyYear === "number"
        ? body.studyYear
        : undefined,

    smartphoneUse:
      body.smartphoneUse as SmartphoneUseRange,

    socialMediaUse:
      body.socialMediaUse as SocialMediaUseRange,

    factCheckFrequency:
      body.factCheckFrequency as number,

    sourceCheckFrequency:
      body.sourceCheckFrequency as number,

    multiSourceFrequency:
      body.multiSourceFrequency as number,

    usedFactCheckTool:
      body.usedFactCheckTool as boolean,

    factCheckToolName:
      typeof body.factCheckToolName ===
        "string" &&
      body.factCheckToolName.trim().length > 0
        ? body.factCheckToolName.trim()
        : undefined,

    usedFactTraceBefore:
      body.usedFactTraceBefore as boolean,

    notes:
      body.notes as string | undefined,
  };

  sendSuccess(
    res,
    await recordSession(session),
    201,
  );
}