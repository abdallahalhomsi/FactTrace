//handles photos sent to /ocr as a multipart file (the base64 json way is handled in the ocr controller)
//the photo stays in memory only and is never saved to disk, which matches the privacy line in the report
//for json requests this middleware does nothing and just passes the request on

import multer from "multer"; //library that reads multipart form uploads
import { ENV } from "../config/env"; //size limit from settings
import { AppError } from "../utils/AppError"; //used to reject wrong file types

//file types both ocr engines can read (heic is left out because tesseract cannot read it)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const imageUpload = multer({
  storage: multer.memoryStorage(), //keep the photo in memory as req.file.buffer
  limits: {
    fileSize: ENV.maxImageMb * 1024 * 1024, //megabytes to bytes
    files: 1, //only one photo per request
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true); //accept the photo
    else cb(new AppError("UNSUPPORTED_MEDIA_TYPE", `Unsupported image type: ${file.mimetype}`)); //reject anything else
  },
}).single("image"); //the app must send the photo in a form field called "image"
