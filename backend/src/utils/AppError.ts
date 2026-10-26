//a custom error type, so any part of the code can stop a request with a clear error code
//the error handler middleware turns it into the standard error response

import { ErrorCode } from "../types/api"; //list of allowed error codes

//which http status goes with each error code
const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  IMAGE_REQUIRED: 400,
  UNSUPPORTED_MEDIA_TYPE: 415,
  FILE_TOO_LARGE: 413,
  PAYLOAD_TOO_LARGE: 413,
  CLAIM_NOT_FOUND: 404,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

//usage: throw a new apperror with a code and a message, for example a claim not found code
export class AppError extends Error {
  readonly code: ErrorCode; //short code sent to the app
  readonly status: number; //http status sent to the app
  readonly details?: unknown; //optional extra info for the app

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message); //sets the normal error message
    this.name = "AppError"; //makes it easy to recognise in logs
    this.code = code; //remember the code
    this.status = STATUS[code]; //look up the matching http status
    this.details = details; //remember any extra info
  }
}
