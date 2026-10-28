import { VerificationResult } from './verification';

export type ApiResponse<T> =
  {
    success: boolean;
    data?: T;
    error?: string | { code: string; message: string };
    message?: string;
  };

export type VerifyClaimRequest = {
  claimText: string;
  source: 'ocr' | 'qr' | 'manual';
  originalOcrText?: string;
  ocrConfidence?: number | null;
};

export type VerifyClaimResponse = {
  success: boolean;
  data?: VerificationResult;
  error?: string;
  message?: string;
};

export type BackendOcrResult = {
  success: boolean;
  text: string;
  confidence: number | null;
  engine: 'cloud_vision' | 'tesseract';
  error: 'NO_TEXT' | 'OCR_FAILED' | 'PARTIAL' | null;
};

export type OcrResponse = {
  success: boolean;
  data?: {
    extractedText: string;
    confidence: number | null;
    engine: BackendOcrResult['engine'] | null;
    ocrError: BackendOcrResult['error'];
  };
  error?: string;
};

export type DecisionRequest = {
  participantId: string;
  condition: 'app' | 'browser';
  claimId: string | null;
  claimText: string;
  originalOcrText?: string;
  inputSource: 'ocr' | 'qr' | 'manual';
  matchStatus?: 'strong_match' | 'weak_match' | 'no_match';
  ocrEngine?: 'cloud_vision' | 'tesseract' | null;
  ocrError?: 'NO_TEXT' | 'OCR_FAILED' | 'PARTIAL' | null;
  decision: 'trust' | 'dont_trust' | 'unsure';
  sharingIntention: 'yes' | 'no' | 'not_sure';
  sourcesOpened: string[];
  startedAt: string;
  endedAt: string;
};

export type DecisionResponse = ApiResponse<{
  decisionId: string;
  durationMs: number;
}>;

export type VerificationEvaluationContext = {
  inputSource: DecisionRequest['inputSource'];
  originalOcrText?: string;
  ocrEngine?: DecisionRequest['ocrEngine'];
  ocrError?: DecisionRequest['ocrError'];
  startedAt: string;
};
