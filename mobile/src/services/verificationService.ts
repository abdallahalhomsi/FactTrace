import {
  ApiResponse,
  VerifyClaimRequest,
  VerifyClaimResponse,
} from '../types/api';
import { VerificationResult } from '../types/verification';
import { apiRequest } from './api';

function getApiError(
  error: ApiResponse<VerificationResult>['error'],
  fallback: string,
): string {
  if (typeof error === 'string') {
    return error;
  }
  return error?.message ?? fallback;
}

function isVerificationResult(
  value: unknown,
): value is VerificationResult {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('originalClaim' in value) ||
    typeof value.originalClaim !== 'string' ||
    !('matchStatus' in value) ||
    (value.matchStatus !== 'strong_match' &&
      value.matchStatus !== 'weak_match' &&
      value.matchStatus !== 'no_match') ||
    (('matchedClaim' in value) &&
      typeof value.matchedClaim !== 'string') ||
    (('claimId' in value) &&
      value.claimId !== null &&
      typeof value.claimId !== 'string') ||
    (('matchScore' in value) &&
      (typeof value.matchScore !== 'number' ||
        !Number.isFinite(value.matchScore))) ||
    (('explanation' in value) &&
      typeof value.explanation !== 'string') ||
    (('matchExplanation' in value) &&
      typeof value.matchExplanation !== 'string') ||
    (('datasetNotice' in value) &&
      typeof value.datasetNotice !== 'string') ||
    !('evidence' in value) ||
    !Array.isArray(value.evidence)
  ) {
    return false;
  }

  return value.evidence.every(
    source =>
      typeof source === 'object' &&
      source !== null &&
      'id' in source &&
      typeof source.id === 'string' &&
      (!('sourceId' in source) ||
        typeof source.sourceId === 'string') &&
      'title' in source &&
      typeof source.title === 'string' &&
      'sourceName' in source &&
      typeof source.sourceName === 'string' &&
      (!('organization' in source) ||
        typeof source.organization === 'string') &&
      (!('author' in source) ||
        typeof source.author === 'string') &&
      (!('publicationDate' in source) ||
        typeof source.publicationDate === 'string') &&
      'summary' in source &&
      typeof source.summary === 'string' &&
      'evidenceText' in source &&
      typeof source.evidenceText === 'string' &&
      'isPrimary' in source &&
      typeof source.isPrimary === 'boolean' &&
      (!('originalUrl' in source) ||
        typeof source.originalUrl === 'string') &&
      (!('provenance' in source) ||
        typeof source.provenance === 'string') &&
      (!('stance' in source) ||
        source.stance === 'supports' ||
        source.stance === 'contradicts' ||
        source.stance === 'context') &&
      (!('sourceType' in source) ||
        source.sourceType === 'news' ||
        source.sourceType === 'fact_check' ||
        source.sourceType === 'official' ||
        source.sourceType === 'academic' ||
        source.sourceType === 'social') &&
      (!('publishedAt' in source) ||
        source.publishedAt === null ||
        typeof source.publishedAt === 'string'),
  );
}

export async function verifyClaim(
  claimText: string,
  requestOptions: Omit<VerifyClaimRequest, 'claimText'> = {
    source: 'manual',
  },
): Promise<VerifyClaimResponse> {
  try {
    const requestBody: VerifyClaimRequest = {
      claimText,
      ...requestOptions,
    };
    const response = await apiRequest<ApiResponse<unknown>>(
      '/api/verify',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: getApiError(
          response.error,
          response.message ?? 'FactTrace could not verify this claim.',
        ),
      };
    }

    if (!isVerificationResult(response.data)) {
      return {
        success: false,
        error: 'The verification service returned an invalid result.',
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to reach the verification service.',
    };
  }
}
