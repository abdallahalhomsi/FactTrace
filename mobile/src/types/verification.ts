import { EvidenceSource } from './evidence';

export type MatchStatus =
  | 'strong_match'
  | 'weak_match'
  | 'no_match';

export type VerificationResult = {
  originalClaim: string;

  matchedClaim?: string;

  matchStatus: MatchStatus;

  matchScore?: number;

  explanation?: string;

  evidence: EvidenceSource[];
};