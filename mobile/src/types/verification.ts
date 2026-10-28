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

  claimId?: string | null;

  matchExplanation?: string;

  weakReason?: 'low_ocr_confidence' | 'low_similarity' | 'both';

  overallStance?: 'supports' | 'contradicts' | 'mixed' | 'unclear';

  datasetNotice?: string;

  provenanceSignals?: {
    key: string;
    label: string;
    detail: string;
    level: 'positive' | 'neutral' | 'warning';
  }[];
};