// SYNCED FILE — mirror of frontend/src/types/shared.ts
// Last synced: 2026-10-26

// ---------- OCR ----------

export type OcrEngine = "cloud_vision" | "tesseract";

export type OcrError = "NO_TEXT" | "OCR_FAILED" | "PARTIAL" | null;

export interface OcrResult {
  success: boolean;
  /** Full extracted text. Empty string if nothing was extracted. */
  text: string;
  /** 0–1. Null if the engine does not return a confidence score.
   *  Note: Tesseract returns 0–100 natively; it is normalized to 0–1 here. */
  confidence: number | null;
  engine: OcrEngine;
  /**
   * NO_TEXT: no readable text found.
   * OCR_FAILED: engine error or unreadable image.
   * PARTIAL: text extracted but low quality — confidence < 0.5 or
   *          text shorter than 10 characters. Text is still returned
   *          so the user can review and edit it.
   */
  error: OcrError;
}

// ---------- Matching ----------

export type ClaimSource = "ocr" | "qr" | "manual";

export type MatchStatus = "MATCH" | "WEAK_MATCH" | "NO_MATCH";

export interface MatchRequest {
  /** Confirmed / edited by the user before matching. */
  claimText: string;
  /** Raw OCR output, for study logging only. */
  originalOcrText?: string;
  source: ClaimSource;
  /** Present only when source === "qr"; skips matching. */
  claimId?: string;
}

export interface MatchResult {
  status: MatchStatus;
  /** Similarity score 0–1. */
  score: number;
  claimId: string | null;
  /**
   * Why the match is weak, for precise UI messaging.
   * Present only when status === "WEAK_MATCH".
   * - "low_ocr_confidence": OCR text quality was low
   * - "low_similarity": OCR text was fine but no strong database match
   * - "both": both signals were weak
   */
  reason?: "low_ocr_confidence" | "low_similarity" | "both";
}

// ---------- Fact Check fallback ----------

export interface FactCheckResult {
  found: boolean;
  rating?: string;
  publisher?: string;
  url?: string;
  reviewDate?: string;
}