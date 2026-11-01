import { VerificationResult } from './verification';

// Shared API response format
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string | { code: string; message: string };
  message?: string;
};

// Verification request
export type VerifyClaimRequest = {
  claimText?: string;
  source: 'ocr' | 'qr' | 'manual';
  claimId?: string;
  originalOcrText?: string;
  ocrConfidence?: number | null;
};

// Verification response
export type VerifyClaimResponse =
  ApiResponse<VerificationResult>;

// OCR response returned by the backend
export type BackendOcrResult = {
  success: boolean;
  text: string;
  confidence: number | null;
  engine: 'cloud_vision' | 'tesseract';
  error:
    | 'NO_TEXT'
    | 'OCR_FAILED'
    | 'PARTIAL'
    | null;
};

// OCR response used by the frontend
export type OcrResponse = ApiResponse<{
  extractedText: string;
  confidence: number | null;
  engine: BackendOcrResult['engine'] | null;
  ocrError: BackendOcrResult['error'];
}>;

// Participant decision submitted for evaluation
export type DecisionRequest = {
  participantId: string;
  condition: 'app' | 'browser';
  claimId: string | null;
  claimText: string;
  originalOcrText?: string;
  inputSource?: 'ocr' | 'qr' | 'manual';
  matchStatus?:
    | 'strong_match'
    | 'weak_match'
    | 'no_match';
  ocrEngine?:
    | 'cloud_vision'
    | 'tesseract'
    | null;
  ocrError?:
    | 'NO_TEXT'
    | 'OCR_FAILED'
    | 'PARTIAL'
    | null;
  decision:
    | 'trust'
    | 'dont_trust'
    | 'unsure';
  sharingIntention:
    | 'yes'
    | 'no'
    | 'not_sure';
  sourcesOpened: string[];
  startedAt: string;
  endedAt: string;
};

// Evaluation response returned by the backend
export type DecisionResponse = ApiResponse<{
  decisionId: string;
  durationMs: number;
}>;

// Context carried through the verification/evaluation flow
export type VerificationEvaluationContext = {
  inputSource: 'ocr' | 'qr' | 'manual';
  originalOcrText?: string;
  ocrEngine?: DecisionRequest['ocrEngine'];
  ocrError?: DecisionRequest['ocrError'];
  startedAt: string;
};