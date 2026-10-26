import {
  VerifyClaimRequest,
  VerifyClaimResponse,
} from '../types/api';

import { VerificationResult } from '../types/verification';

import { apiRequest } from './api';

/*
  Keep TRUE until Rand connects the real backend.

  Later:
  const USE_MOCK_API = false;
*/
const USE_MOCK_API = true;

const wait = (ms: number) =>
  new Promise(resolve =>
    setTimeout(resolve, ms),
  );

function createStrongMatch(
  claimText: string,
): VerificationResult {
  return {
    originalClaim: claimText,

    matchedClaim:
      'Example matched claim from the FactTrace evidence database.',

    matchStatus: 'strong_match',

    matchScore: 92,

    explanation:
      'FactTrace found a closely matching claim and relevant evidence for you to review.',

    evidence: [
      {
        id: 'source-1',

        title:
          'Evidence relevant to the matched claim',

        sourceName:
          'Primary Evidence Source',

        organization:
          'Example Publisher',

        author:
          'Source Author',

        publicationDate:
          'October 2026',

        summary:
          'This source provides information directly related to the claim and gives context that can help you assess the evidence.',

        evidenceText:
          'This section contains the complete evidence associated with the matched claim. The final version will use evidence returned by the backend.',

        originalUrl:
          'https://example.com',

        provenance:
          'Original publication → FactTrace evidence record',

        isPrimary: true,
      },

      {
        id: 'source-2',

        title:
          'Additional supporting information',

        sourceName:
          'Supporting Evidence Source',

        organization:
          'Example Reference Organization',

        publicationDate:
          'September 2026',

        summary:
          'This source provides additional context so you can compare multiple pieces of evidence before reaching a conclusion.',

        evidenceText:
          'This supporting source contains additional information connected to the matched claim.',

        originalUrl:
          'https://example.com',

        provenance:
          'Reference publication → FactTrace evidence record',

        isPrimary: false,
      },
    ],
  };
}

function createWeakMatch(
  claimText: string,
): VerificationResult {
  return {
    originalClaim: claimText,

    matchedClaim:
      'A possibly related claim was found, but the wording and context do not match closely.',

    matchStatus: 'weak_match',

    matchScore: 58,

    explanation:
      'FactTrace found a possible match. The available evidence may be related, so review it carefully before making a decision.',

    evidence: [
      {
        id: 'weak-source-1',

        title:
          'Possibly related supporting information',

        sourceName:
          'Related Evidence Source',

        organization:
          'Example Research Organization',

        publicationDate:
          'August 2026',

        summary:
          'This source appears related to part of the claim, but the match is not strong enough to treat it as an exact match.',

        evidenceText:
          'The available evidence overlaps with some parts of the submitted claim, but differences in wording or context remain.',

        originalUrl:
          'https://example.com',

        provenance:
          'Related publication → FactTrace evidence record',

        isPrimary: true,
      },
    ],
  };
}

function createNoMatch(
  claimText: string,
): VerificationResult {
  return {
    originalClaim: claimText,

    matchStatus: 'no_match',

    matchScore: 18,

    explanation:
      'FactTrace could not find a closely matching claim or relevant evidence in the available records.',

    evidence: [],
  };
}

export async function verifyClaim(
  claimText: string,
): Promise<VerifyClaimResponse> {
  /*
    MOCK DEVELOPMENT MODE

    Use these words anywhere in the claim:

    "weak"  -> weak match
    "none"  -> no match
    "error" -> verification failure

    Everything else -> strong match
  */
  if (USE_MOCK_API) {
    await wait(900);

    const normalized =
      claimText.toLowerCase();

    if (normalized.includes('error')) {
      return {
        success: false,

        error:
          'Mock verification error for testing.',
      };
    }

    if (normalized.includes('none')) {
      return {
        success: true,

        data:
          createNoMatch(
            claimText,
          ),
      };
    }

    if (normalized.includes('weak')) {
      return {
        success: true,

        data:
          createWeakMatch(
            claimText,
          ),
      };
    }

    return {
      success: true,

      data:
        createStrongMatch(
          claimText,
        ),
    };
  }

  /*
    REAL BACKEND MODE

    Rand can enable this later.
  */

  const requestBody: VerifyClaimRequest = {
    claimText,
  };

  return apiRequest<VerifyClaimResponse>(
    '/api/verify',
    {
      method: 'POST',

      body: JSON.stringify(
        requestBody,
      ),
    },
  );
}