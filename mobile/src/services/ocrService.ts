import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import {
  ApiResponse,
  BackendOcrResult,
  OcrResponse,
} from '../types/api';
import { getApiBaseUrl } from './api';

function getApiError(
  error: ApiResponse<BackendOcrResult>['error'],
  fallback: string,
): string {
  if (typeof error === 'string') {
    return error;
  }
  return error?.message ?? fallback;
}

export async function extractTextFromImage(
  imageUri: string,
): Promise<OcrResponse> {
  try {
    const formData = new FormData();
    formData.append(
      'image',
      new File(imageUri),
      'claim.jpg',
    );

    const response = await fetch(
      `${getApiBaseUrl()}/api/ocr`,
      {
        method: 'POST',
        body: formData,
      },
    );

    let envelope: ApiResponse<BackendOcrResult>;
    try {
      envelope = (await response.json()) as ApiResponse<BackendOcrResult>;
    } catch {
      return {
        success: false,
        error: 'The OCR service returned an invalid response.',
      };
    }

    if (!response.ok || !envelope.success || !envelope.data) {
      return {
        success: false,
        error: getApiError(
          envelope.error,
          `OCR request failed with status ${response.status}.`,
        ),
      };
    }

    const ocrResult = envelope.data;
    return {
      success: ocrResult.success,
      data: {
        extractedText: ocrResult.text,
        confidence: ocrResult.confidence,
        engine: ocrResult.engine,
        ocrError: ocrResult.error,
      },
      error:
        ocrResult.error === 'NO_TEXT'
          ? 'No readable text was detected in the image.'
          : ocrResult.error === 'OCR_FAILED'
            ? 'FactTrace could not extract text from the image.'
            : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to reach the OCR service.',
    };
  }
}
