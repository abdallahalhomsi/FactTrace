//the one place where errors become responses, so every error looks the same to the app
//express 5 sends errors from async functions here automatically, no try/catch needed in controllers

import { NextFunction, Request, Response } from "express"; //express types
import multer from "multer"; //needed to recognise upload errors
import { AppError } from "../utils/AppError"; //our own error type
import { sendError } from "../utils/apiResponse"; //sends the standard error body
import { ENV, isProd } from "../config/env"; //size limit and production flag

//runs when no route matched the url, and passes a not found error to the handler below
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`));
}

//errors thrown by express itself while reading the body (bad json, body too big) carry a 4xx status
interface HttpError {
  status?: number; //http status picked by express
  type?: string; //short reason, for example "entity.parse.failed"
}

//turns any error into the standard error response
//express knows this is an error handler because it has 4 parameters, so _next must stay
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  //our own errors already have a code and status
  if (err instanceof AppError) {
    sendError(res, err.status, { code: err.code, message: err.message, details: err.details });
    return;
  }

  //errors from the photo upload
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      sendError(res, 413, { code: "FILE_TOO_LARGE", message: `Image must be under ${ENV.maxImageMb} MB` }); //photo too big
    } else {
      sendError(res, 400, { code: "VALIDATION_ERROR", message: err.message, details: { field: err.field } }); //for example wrong field name
    }
    return;
  }

  //errors from reading the json body
  const httpErr = err as HttpError;
  if (typeof httpErr?.status === "number" && httpErr.status >= 400 && httpErr.status < 500) {
    if (httpErr.type === "entity.parse.failed") {
      sendError(res, 400, { code: "VALIDATION_ERROR", message: "Malformed JSON body" }); //json could not be read
    } else if (httpErr.status === 413) {
      sendError(res, 413, { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" }); //json too big
    } else if (httpErr.status === 415) {
      sendError(res, 415, { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported body encoding" }); //strange encoding
    } else {
      sendError(res, 400, { code: "VALIDATION_ERROR", message: "Bad request" }); //any other client mistake
    }
    return;
  }

  //anything else is a bug on our side: log it fully, but only show details outside production
  console.error("[unhandled error]", err);
  sendError(res, 500, {
    code: "INTERNAL_ERROR",
    message: isProd ? "Something went wrong" : String((err as Error)?.message ?? err),
  });
}
