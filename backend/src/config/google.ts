import path from "path";

export const GOOGLE_CONFIG = {
  credentialsPath:
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, "../../secrets/gcp-key.json"),
  ocrPrimary: (process.env.OCR_PRIMARY ?? "cloud_vision") as
    | "cloud_vision"
    | "tesseract",
};