import { VerificationResult } from '../types/verification';
import { VerificationEvaluationContext } from '../types/api';

export type RootStackParamList = {
  Home: undefined;

  Camera: undefined;

  ClaimReview: {
    claimText?: string;
    imageUri?: string;
  };

  VerificationResults: {
    result: VerificationResult;
    historyEntryId?: string;
    evaluation?: VerificationEvaluationContext;
  };

  EvidenceDetails: {
    result?: VerificationResult;
    sourceId?: string;
  };

  VerificationHistory: undefined;

  BrowserComparison: undefined;

  Profile: undefined;

  Login: undefined;

  SignUp: undefined;
};