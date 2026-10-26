//two small helpers so every response has exactly the same shape
//controllers call sendsuccess, the error handler calls senderror

import { Response } from "express"; //express response object type
import { ApiError, ApiFailure, ApiSuccess } from "../types/api"; //response shapes

//sends { success: true, data } with status 200 unless another status is given
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data }; //build the success body
  res.status(status).json(body); //send it as json
}

//sends { success: false, error } with the given status
export function sendError(res: Response, status: number, error: ApiError): void {
  const body: ApiFailure = { success: false, error }; //build the failure body
  res.status(status).json(body); //send it as json
}
