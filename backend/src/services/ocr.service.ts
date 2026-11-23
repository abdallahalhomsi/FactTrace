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

//a line counts as noise if it has fewer than 2 letters or digits, or if they are under half of its visible characters
function isNoiseLine(line: string): boolean {
  const visible = line.replace(/\s/g, ""); //characters without spaces
  const alnum = (visible.match(/[\p{L}\p{N}]/gu) ?? []).length; //letters and digits in any language
  return alnum < 2 || alnum / visible.length < 0.5;
}

//cleans raw ocr text before matching and before the participant reviews it, without changing any words
//removes noise lines, tabs, bullets and invisible characters, and joins lines (and words split across lines)
export function cleanOcrText(rawText: string): string {
  if (!rawText) return "";
  const lines = rawText
    .normalize("NFC") //one form for accented letters
    .replace(/[\u200B-\u200D\uFEFF]/g, "") //invisible characters
    .replace(/[\u2018\u2019]/g, "'") //curly single quotes to straight
    .replace(/[\u201C\u201D]/g, '"') //curly double quotes to straight
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t\f\v ]+/g, " ").trim()) //tabs and repeated spaces
    .map((line) => line.replace(/^[•·▪◦*>|-]+\s+/u, "")) //bullet marks at the start of a line
    .filter((line) => line.length > 0 && !isNoiseLine(line)); //drop empty and garbage lines

  let text = "";
  for (const line of lines) {
    if (!text) {
      text = line;
    } else if (/\p{L}-$/u.test(text) && /^\p{Ll}/u.test(line)) {
      text = text.slice(0, -1) + line; //word split across lines ("misinfor-" then "mation"): join without the hyphen
    } else {
      text += " " + line;
    }
  }
  return text.replace(/\s+/g, " ").trim();
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

    const text = cleanOcrText(data.text ?? ""); //cleanup also trims
    
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

    const text = cleanOcrText(response.fullTextAnnotation?.text ?? ""); //cleanup also trims

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