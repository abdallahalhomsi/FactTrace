//post /api/ocr: takes a photo and returns the text found in it
//the agreed way is json { "image": "<base64>" }, a multipart file in field "image" also works,
//so the frontend can pick whichever is easier without any backend change

import { Request, Response } from "express"; //express types
import { ocr } from "../services/ocr.service"; //manaal's ocr (cloud vision with tesseract fallback)
import { ENV } from "../config/env"; //photo size limit
import { sendSuccess } from "../utils/apiResponse"; //standard success response
import { decodeBase64Image } from "../utils/base64Image"; //base64 text to image bytes

//always answers 200 with an ocr result once a valid photo arrives
//no text, ocr failed and partial are states the app shows to the user (for example a "check this text" warning), not http errors
export async function postOcr(req: Request, res: Response): Promise<void> {
  const imageBuffer = req.file
    ? req.file.buffer //sent as a multipart file, already read into memory by the upload middleware
    : decodeBase64Image((req.body as Record<string, unknown> | undefined)?.image, ENV.maxImageMb * 1024 * 1024); //sent as base64 json

  const result = await ocr(imageBuffer); //run ocr on the photo bytes in memory, nothing is saved
  sendSuccess(res, result); //send text, confidence, engine and error back so the app can show warnings
}
