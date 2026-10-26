import { createWorker } from "tesseract.js";
import vision from "@google-cloud/vision";
import { OcrResult } from "../types/shared";
import { GOOGLE_CONFIG } from "../config/google";

const MIN_TEXT_LENGTH = 10;
const MIN_CONFIDENCE = 0.5;

/**
 * Tesseract OCR. Pure JS, no native build.
 * Tesseract returns confidence 0–100; normalized to 0–1 here.
 */
export async function tesseractOcr(imageBuffer: Buffer): Promise<OcrResult> {
  try {
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(imageBuffer);
    await worker.terminate();

    const text = (data.text ?? "").trim();
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
  }
}

/**
 * Cloud Vision OCR via documentTextDetection (word-level confidence populated).
 * Returns confidence 0–1 (mean of word-level confidences), or null if none.
 */
export async function cloudVisionOcr(imageBuffer: Buffer): Promise<OcrResult> {
  try {
    const client = new vision.ImageAnnotatorClient({
      keyFilename: GOOGLE_CONFIG.credentialsPath,
    });

    const [response] = await client.documentTextDetection({
      image: { content: imageBuffer },
    });

    const text = (response.fullTextAnnotation?.text ?? "").trim();

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