import { createWorker } from "tesseract.js";
import vision from "@google-cloud/vision";
import { OcrResult } from "../types/shared";
import { GOOGLE_CONFIG } from "../config/google";
import path from "path";
import fs from "fs";

const MIN_TEXT_LENGTH = 10;
const MIN_CONFIDENCE = 0.5;

//use the english model bundled from npm (@tesseract.js-data/eng) so tesseract works offline
//without this, tesseract downloads the model from the internet on every request,
//and if that download fails the request hangs forever
const TESSERACT_LANG_PATH = path.join(
  path.dirname(require.resolve("@tesseract.js-data/eng/package.json")),
  "4.0.0_best_int"
);

/**
 * Cleans up raw OCR text to improve matching accuracy.
 * - Normalizes whitespace and merges broken lines.
 * - Removes lines that contain only noise/punctuation.
 * - Preserves the original meaning.
 */
function cleanOcrText(rawText: string): string {
  if (!rawText) return "";

  // Split into lines to filter out garbage lines
  const lines = rawText.split(/\r?\n/);
  
  const cleanedLines = lines
    .map((line) => line.trim())
    // Remove lines that have no alphanumeric characters (just symbols or empty)
    .filter((line) => /[a-zA-Z0-9]/.test(line));

  // Join the valid lines with a space
  let text = cleanedLines.join(" ");

  // Collapse multiple spaces into one
  text = text.replace(/\s{2,}/g, " ").trim();

  return text;
}

/**
 * Tesseract OCR. Pure JS, no native build.
 * Tesseract returns confidence 0–100; normalized to 0–1 here.
 */
export async function tesseractOcr(imageBuffer: Buffer): Promise<OcrResult> {
  //errorhandler is required: without it tesseract throws worker errors outside
  //our try/catch, which crashes the whole server
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("eng", undefined, {
      langPath: TESSERACT_LANG_PATH, //load the model from the bundled folder
      cacheMethod: "none", //do not write a copy of the model into the project folder
      errorHandler: () => {}, //errors still reach the catch below through the rejected promise
    });
    const { data } = await worker.recognize(imageBuffer);

    const rawText = (data.text ?? "").trim();
    const text = cleanOcrText(rawText);
    
    const confidence =
      typeof data.confidence === "number" ? data.confidence / 100 : null;

    if (text.length === 0) {
      return {
        success: false,
        text: "",
        confidence,
        engine: "tesseract",
        error: "NO_TEXT",
      };
    }

    const isPartial =
      (confidence !== null && confidence < MIN_CONFIDENCE) ||
      text.length < MIN_TEXT_LENGTH;

    return {
      success: true,
      text,
      confidence,
      engine: "tesseract",
      error: isPartial ? "PARTIAL" : null,
    };
  } catch (err) {
    return {
      success: false,
      text: "",
      confidence: null,
      engine: "tesseract",
      error: "OCR_FAILED",
    };
  } finally {
    //always shut the worker down, even when recognition failed, so workers do not pile up
    await worker?.terminate().catch(() => {});
  }
}

/**
 * Cloud Vision OCR via documentTextDetection (word-level confidence populated).
 * Returns confidence 0–1 (mean of word-level confidences), or null if none.
 */
export async function cloudVisionOcr(imageBuffer: Buffer): Promise<OcrResult> {
  //a missing key file makes the google client throw an error we cannot catch, which crashes the server
  //so check first and return ocr_failed, which makes ocr() fall back to tesseract
  if (!fs.existsSync(GOOGLE_CONFIG.credentialsPath)) {
    console.warn(`[ocr] Cloud Vision key not found at ${GOOGLE_CONFIG.credentialsPath}; using Tesseract`);
    return { success: false, text: "", confidence: null, engine: "cloud_vision", error: "OCR_FAILED" };
  }
  try {
    const client = new vision.ImageAnnotatorClient({
      keyFilename: GOOGLE_CONFIG.credentialsPath,
    });

    const [response] = await client.documentTextDetection({
      image: { content: imageBuffer },
    });

    const rawText = (response.fullTextAnnotation?.text ?? "").trim();
    const text = cleanOcrText(rawText);

    const pages = response.fullTextAnnotation?.pages ?? [];
    const wordConfidences: number[] = [];
    for (const page of pages) {
      for (const block of page.blocks ?? []) {
        for (const paragraph of block.paragraphs ?? []) {
          for (const word of paragraph.words ?? []) {
            if (typeof word.confidence === "number" && word.confidence > 0) {
              wordConfidences.push(word.confidence);
            }
          }
        }
      }
    }
    const confidence =
      wordConfidences.length > 0
        ? wordConfidences.reduce((a, b) => a + b, 0) / wordConfidences.length
        : null;

    if (text.length === 0) {
      return {
        success: false,
        text: "",
        confidence,
        engine: "cloud_vision",
        error: "NO_TEXT",
      };
    }

    const isPartial =
      (confidence !== null && confidence < MIN_CONFIDENCE) ||
      text.length < MIN_TEXT_LENGTH;

    return {
      success: true,
      text,
      confidence,
      engine: "cloud_vision",
      error: isPartial ? "PARTIAL" : null,
    };
  } catch (err) {
    return {
      success: false,
      text: "",
      confidence: null,
      engine: "cloud_vision",
      error: "OCR_FAILED",
    };
  }
}

/**
 * Main entry point. Calls the primary engine; falls back to Tesseract on
 * failure or NO_TEXT. Always returns OcrResult.
 */
export async function ocr(imageBuffer: Buffer): Promise<OcrResult> {
  if (GOOGLE_CONFIG.ocrPrimary === "cloud_vision") {
    const primary = await cloudVisionOcr(imageBuffer);
    if (primary.success && primary.error !== "NO_TEXT") {
      return primary;
    }
    return tesseractOcr(imageBuffer);
  }
  return tesseractOcr(imageBuffer);
}