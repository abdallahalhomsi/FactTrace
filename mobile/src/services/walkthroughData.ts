
import { VerificationResult } from '../types/verification';
import { PRACTICE_CLAIM } from './walkthroughService';

/**
 * An illustrative teaching fixture. It is NOT a fact-check, real source,
 * model score, or backend response, and must never enter saved evaluations.
 */
export const PRACTICE_RESULT: VerificationResult = {
  originalClaim: PRACTICE_CLAIM,
  matchedClaim: PRACTICE_CLAIM,
  matchStatus: 'strong_match',
  matchScore: 92,
  explanation:
    'Practice example: a strong match means the wording is similar, not that the claim has been proven true.',
  datasetNotice:
    'PRACTICE ONLY. The match score and source below are fictional teaching examples, not verified evidence.',
  overallStance: 'unclear',
  evidence: [
    {
      id: 'practice-source-1',
      sourceName: 'Practice source (fictional)',
      title: 'Example evidence record: storing honey',
      organization: 'FactTrace tutorial — demonstration only',
      summary:
        'This is a placeholder evidence summary to show where a real source summary would appear. It has not been fact-checked.',
      evidenceText:
        'In a real check, read the cited source, consider its publication context, and judge whether it supports the exact claim.',
      provenance:
        'Created solely for this interactive walkthrough. No publication or original source URL is claimed.',
      isPrimary: true,
      stance: 'context',
    },
  ],
};
