//get /api/config: the answer options the app should show
//the app can build the decision buttons and sharing popup from this, so changing options needs no app update

import { Request, Response } from "express"; //express types
import { SHARING_OPTIONS, VERDICT_OPTIONS } from "../config/study"; //options defined in one place
import { StudyConfigResponse } from "../types/api"; //response shape
import { sendSuccess } from "../utils/apiResponse"; //standard success response

export function getConfig(_req: Request, res: Response): void {
  const data: StudyConfigResponse = {
    decisionOptions: VERDICT_OPTIONS.map(({ value, label }) => ({ value, label })), //leave out the scoring rules
    sharingOptions: SHARING_OPTIONS.map(({ value, label }) => ({ value, label })),
  };
  sendSuccess(res, data);
}
