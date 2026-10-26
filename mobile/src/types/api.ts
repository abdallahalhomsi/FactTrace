import { VerificationResult } from './verification';

export type ApiResponse<T> = {
  success: boolean;

  data?: T;

  message?: string;

  error?: string;
};

export type VerifyClaimRequest = {
  claimText: string;
};

export type VerifyClaimResponse =
  ApiResponse<VerificationResult>;

export type OcrResponse = ApiResponse<{
  extractedText: string;
}>;