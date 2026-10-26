//get /api/health: quick check that the server is up and reachable from the phone
//it also says which ocr engine will run, which helps when cloud vision silently falls back to tesseract

import fs from "fs"; //used to check whether the google key file exists
import { Request, Response } from "express"; //express types
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { HealthResponse } from "../types/api"; //response shape
import { GOOGLE_CONFIG } from "../config/google"; //manaal's ocr settings

export function getHealth(_req: Request, res: Response): void {
  const data: HealthResponse = {
    status: "ok", //the server answered, so it is up
    uptimeSeconds: Math.round(process.uptime()), //seconds since the server started
    timestamp: new Date().toISOString(), //current server time
    ocr: {
      primary: GOOGLE_CONFIG.ocrPrimary, //engine tried first
      cloudVisionKeyFound: fs.existsSync(GOOGLE_CONFIG.credentialsPath), //false means tesseract will be used
    },
  };
  sendSuccess(res, data);
}
