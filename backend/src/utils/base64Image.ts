//turns a base64 photo sent by the app into raw bytes, and checks it really is a supported image
//base64 is how the team agreed the app sends photos (as json: { "image": "<base64>" })

import { AppError } from "./AppError"; //used for clear errors

//optional "data:image/jpeg;base64," prefix that some phone libraries add in front
const DATA_URL_PREFIX = /^data:[\w/+.-]+;base64,/i;
//only characters base64 can contain, with up to two "=" at the end
const BASE64_CHARS = /^[A-Za-z0-9+/]+={0,2}$/;

//detects the image type from its first bytes, because a base64 string has no file type attached
function detectImageType(bytes: Buffer): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg"; //jpeg files start with ff d8 ff
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png"; //png signature
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp"; //webp signature
  return null; //anything else is not supported
}

//decodes the base64 text and returns the image bytes, or throws a clear error
export function decodeBase64Image(value: unknown, maxBytes: number): Buffer {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("IMAGE_REQUIRED", 'Send the photo as base64 in the "image" field'); //nothing usable was sent
  }

  const cleaned = value.replace(DATA_URL_PREFIX, "").replace(/\s/g, ""); //drop the prefix and any line breaks
  if (!BASE64_CHARS.test(cleaned)) {
    throw new AppError("VALIDATION_ERROR", '"image" is not valid base64'); //contains characters base64 cannot have
  }

  const bytes = Buffer.from(cleaned, "base64"); //base64 text to raw bytes
  if (bytes.length > maxBytes) {
    throw new AppError("FILE_TOO_LARGE", `Image must be under ${Math.round(maxBytes / 1024 / 1024)} MB`); //photo too big
  }
  if (!detectImageType(bytes)) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Image must be a jpeg, png or webp"); //not a photo we can read
  }
  return bytes;
}
